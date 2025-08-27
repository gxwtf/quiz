const pool = require('../config/db');
const pool2 = require('../config/db2');

// 新增获取比赛详情接口
exports.getQuizDetails = async (req, res) => {
    try {
        const [quiz] = await pool.query(
            `SELECT id, name, invite_code, notice, status 
       FROM quizzes 
       WHERE id = ?`,
            [req.params.id]
        );

        if (!quiz.length) {
            return res.status(404).json({ error: "比赛不存在" });
        }

        // 转换字段命名风格（下划线转驼峰）
        const responseData = {
            ...quiz[0],
            inviteCode: quiz[0].invite_code
        };

        res.json(responseData);
    } catch (error) {
        res.status(500).json({
            error: "服务器错误",
            detail: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.startQuiz = async (req, res) => {
    const quizId = req.params.id;
    let connection;

    try {

        connection = await pool.getConnection();

        // 3. 开启事务
        await connection.beginTransaction();

        // 4. 检查比赛是否存在
        const [quiz] = await connection.query(
            `SELECT id, status, started_at 
       FROM quizzes 
       WHERE id = ? 
       FOR UPDATE`,
            [quizId]
        );

        if (quiz.length === 0) {
            return res.status(404).json({
                error: "指定的比赛不存在",
                code: "QUIZ_NOT_FOUND"
            });
        }

        // 5. 验证当前状态
        if (quiz[0].status === 'active') {
            return res.status(409).json({
                error: "比赛已处于激活状态",
                current_status: quiz[0].status,
                started_at: quiz[0].started_at,
                code: "ALREADY_ACTIVE"
            });
        }

        // 6. 执行状态更新
        const [updateResult] = await connection.query(
            `UPDATE quizzes 
       SET status = 'active',
           started_at = CURRENT_TIMESTAMP()
       WHERE id = ?`,
            [quizId]
        );

        // 7. 验证更新结果
        if (updateResult.affectedRows !== 1) {
            throw new Error("更新比赛状态失败");
        }

        // 8. 提交事务
        await connection.commit();

        // 9. 获取更新后的数据
        const [updatedQuiz] = await connection.query(
            `SELECT id, name, status, started_at 
       FROM quizzes 
       WHERE id = ?`,
            [quizId]
        );

        res.json({
            success: true,
            data: updatedQuiz[0]
        });

    } catch (error) {
        // 回滚事务
        if (connection) await connection.rollback();

        console.error(`[${new Date().toISOString()}] 启动失败:`, error);

        res.status(500).json({
            error: "服务器内部错误",
            code: "INTERNAL_ERROR",
            detail: process.env.NODE_ENV === 'development' ? error.message : undefined
        });

    } finally {
        // 释放连接
        if (connection) connection.release();
    }
};

exports.getQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        if (!global.quizStat[id]) {
            return res.status(404).json({ success: false, adminOffline: true });
        }
        console.log(id);
        console.log(global.quizStat[id]);
        const num = global.quizStat[id].num || 0;
        console.log(num, global.quizStat[id].isRunning);
        if (!global.quizStat[id].isRunning) {
            return res.status(403).json({ success: false, error: '答题已截止', adminOffline: false });
        }
        const [questions] = await pool.query(
            `SELECT 
        id, type, content, score, time_limit, options 
      FROM questions 
      WHERE quiz_id = ? 
      ORDER BY id ASC`,
            [id]
        );
        const currentQuestion = questions[num]; // 根据索引获取题目
        let isEnd = false;
        if (num >= questions.length) isEnd = true;
        if (!isEnd && !currentQuestion) {
            return res.status(404).json({ success: false, error: '没有找到题目', adminOffline: false });
        }
        // console.log(isEnd,currentQuestion);
        if (currentQuestion) {
            var endtime = new Date();
            endtime = new Date(endtime.setSeconds(endtime.getSeconds() + currentQuestion.time_limit * 60));
            currentQuestion.endtime = endtime;
        }

        res.json({ success: true, question: currentQuestion, isEnd: isEnd, adminOffline: false });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message, adminOffline: false });
    }
};

// 结束比赛接口示例
exports.endQuiz = async (req, res) => {
    const quizId = req.params.id;
    try {
        global.quizStat[quizId].num = 114514;
        // 同时更新状态和结束时间
        await pool.query(
            `UPDATE quizzes 
       SET status = 'ended', ended_at = NOW()
       WHERE id = ?`,
            [quizId]
        );

        // 返回结束时间用于前端显示
        const [result] = await pool.query(
            `SELECT ended_at FROM quizzes WHERE id = ?`,
            [quizId]
        );

        // 查找quizzes对应的所有题目
        const [questions] = await pool.query(
            `SELECT * FROM questions WHERE quiz_id = ?`,
            [quizId]
        );

        console.log(questions);
        // 查找每个题目中用户的得分
        const userScores = {};
        for (const question of questions) {
            const [scores] = await pool.query(
                `SELECT user_id, score FROM question_rank WHERE question_id = ?`,
                [question.id]
            );

            for (const score of scores) {
                if (!userScores[score.user_id]) {
                    userScores[score.user_id] = 0;
                }
                userScores[score.user_id] += score.score;
            }
        }

        await pool.query(
            `DELETE FROM quiz_rank WHERE quiz_id = ?`,
            [quizId]
        );

        for (const userId in userScores) {
            // 查找用户的username
            const [user] = await pool2.query(
                `SELECT username FROM users WHERE id = ?`,
                [userId]
            );

            if (user.length > 0) {
                const username = user[0].username;
                const score = userScores[userId];

                let correctNum = 0;
                let submitNum = 0;

                const [correct] = await pool.query(`SELECT COUNT(*) as count FROM submissions WHERE user_id = ? AND correct = 1`, [userId]);

                if (correct.length > 0) {
                    correctNum = correct[0].count;
                }
                const [submit] = await pool.query(`SELECT COUNT(*) as count FROM submissions WHERE user_id = ?`, [userId]);
                if (submit.length > 0) {
                    submitNum = submit[0].count;
                }

                await pool.query(
                    `INSERT INTO quiz_rank (quiz_id, user_id, user_name, score, correct_num, submit_num) VALUES (?, ?, ?, ?, ?, ?)`,
                    [quizId, userId, username, score, correctNum, submitNum]
                );
            }
        }
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
};


function Calculate(totScore, rank, lowestScore, num = 50) {
    console.log(totScore, rank, lowestScore, num);
    if (num == 1) return totScore;
    lowestScore = lowestScore || Math.max(1, totScore / 10);
    return totScore * Math.pow(lowestScore / totScore, (rank - 1) / (num - 1));
}


function validateAnswer(type, correctAnswers, userAnswer) {
    let userAnswers;

    // 解析用户答案
    if (type === '填空题') {
        userAnswers = [userAnswer.trim()];
    } else {
        userAnswers = userAnswer.includes(',') ? userAnswer.split(',').map(a => a.trim()) : userAnswer.split('').map(a => a.trim());
    }

    // 处理 isCorrect 的逻辑
    let isCorrect;
    if (type === '单选题' || type === '填空题') {
        isCorrect = correctAnswers.length === 1 && correctAnswers[0] === userAnswers[0];
    } else if (type === '多选题') {
        isCorrect = correctAnswers.length === userAnswers.length && correctAnswers.every(a => userAnswers.includes(a));
    } else {
        isCorrect = false;
    }

    return { isCorrect, userAnswers };
}

// 提交答案接口
exports.submitAnswer = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const username = req.session.user.username;
        const { questionId, answer, quizId } = req.body;

        // 检查用户是否已经提交过答案
        const [count] = await pool.query(
            `SELECT COUNT(*) as count FROM submissions WHERE user_id = ? AND question_id = ?`,
            [userId, questionId]
        );

        if (count[0].count > 0) {
            return res.status(400).json({ error: '你已经提交过答案' });
        }
        // 获取题目和正确答案
        const [questions] = await pool.query(
            `SELECT type, answer, score, lowestScore FROM questions WHERE id = ?`,
            [questionId]
        );

        if (questions.length === 0) {
            return res.status(404).json({ error: '题目不存在' });
        }

        const { type, answer: correctAnswer } = questions[0];
        const correctAnswers = JSON.parse(correctAnswer).map(a => a.trim());
        const { isCorrect, userAnswers } = validateAnswer(type, correctAnswers, answer);

        console.log(correctAnswers, answer, isCorrect);

        // 插入提交记录
        await pool.query(
            `INSERT INTO submissions (user_id, question_id, answer, correct) VALUES (?, ?, ?, ?)`,
            [userId, questionId, JSON.stringify(userAnswers), isCorrect]
        );
        let score = 0;
        if (isCorrect) {
            const [count] = await pool.query(
                `SELECT COUNT(*) as count FROM question_rank WHERE question_id = ? AND score != 0`,
                [questionId]
            );
            const rank = count[0].count + 1;
            const lowestScore = questions[0].lowestScore;
            const totScore = questions[0].score;
            console.log(quizId);
            const [participant_num] = await pool.query(
                `SELECT participant_num FROM quizzes WHERE id = ?`,
                [quizId]
            );
            console.log(participant_num);
            score = Calculate(totScore, rank, lowestScore, participant_num[0].participant_num);
            console.log(rank, totScore, score);
            global.quizSystem_io.of('/').to(quizId + '-admin').emit('correct', { username, score });
        }
        await pool.query(
            `INSERT INTO question_rank (question_id, user_id, user_name, score) VALUES (?, ?, ?, ?)`,
            [questionId, userId, username, score]
        );

        res.json({ success: true, isCorrect });
    } catch (error) {
        console.error(`提交答案时出错: ${error}`);
        res.status(500).json({ error: error.message });
    }
};
