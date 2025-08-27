const express = require('express');
const router = express.Router({ mergeParams: true });
const pool = require('../config/db');
const pool2 = require('../config/db2');
const { v4: uuidv4 } = require('uuid');
const XLSX = require('xlsx');
const multer = require('multer');
const fs = require('fs');
const quizController = require('../controllers/quizController');
const path = require('path'); // 确保引入 path 模块
const generateCertificate = require('../generate/generate'); // 确保路径正确

// 配置multer中间件
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/'); // 确保此目录存在
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    }
  })
});

// 认证中间件
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: '未登录' });
  }
  // if(req.session.cheatTime){
  //   console.log('check cheating');
  //   // console.log((new Date()).getTime(),req.session.cheatTime);
  //   const tm=(new Date()).getTime()-req.session.cheatTime;
  //   console.log('tm',tm);
  //   if(tm<5*60*1000) return res.status(403).json({ error: '作弊处罚中' });
  // }
  next();
};

// 修复后的下载模板路由
router.get('/download-template', requireAuth, (req, res) => {
  const filePath = path.join(__dirname, '../public/src/sample.xlsx'); // 确保路径正确
  res.download(filePath, 'sample.xlsx', (err) => {
    if (err) {
      console.error('模板下载失败:', err);
      res.status(500).send('模板下载失败');
    }
  });
});

// 获取比赛列表接口
router.get('/quizzes', requireAuth, async (req, res) => {
  try {
    const [quizzes] = await pool.query(`
      SELECT id, name, invite_code, status, created_at, participant_num, started_at, ended_at,
      DATE_FORMAT(quiz_date, '%Y-%m-%d') AS quiz_date
      FROM quizzes 
      ORDER BY created_at DESC
    `);
    res.json({ data: quizzes });
  } catch (error) {
    console.error('获取比赛列表失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 删除题目接口
router.delete('/:id/quizzes', async (req, res) => {
  try {
    await pool.query(`
      DELETE FROM quizzes where id=?
    `, req.params.id);
    return res.json(null);
  } catch (error) {
    console.error('删除题目失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/cheat', requireAuth, async (req, res) => {
  try {
    console.log('hello');
    req.session.cheatTime = (new Date()).getTime();
    console.log(req.session);
    res.json({ message: '作弊已记录' });
  }
  catch (error) {
    console.error('作弊处理失败：', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取单个比赛详情
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [quiz] = await pool.query(`
      SELECT 
        id, name, invite_code, notice, status,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_at,
        DATE_FORMAT(started_at, '%Y-%m-%d %H:%i') AS started_at,
        DATE_FORMAT(ended_at, '%Y-%m-%d %H:%i') AS ended_at,
        first_prize_num, second_prize_num, third_prize_num,
        DATE_FORMAT(quiz_date, '%Y-%m-%d') AS quiz_date
      FROM quizzes 
      WHERE id = ?
    `, [id]);

    res.json({ data: quiz[0] || null });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新比赛信息
router.post('/manage/info', requireAuth, async (req, res) => {
  try {
    const { id, name, invite_code, notice, first_prize_num, second_prize_num, third_prize_num, quiz_date } = req.body;
    await pool.query(
      `UPDATE quizzes 
      SET name = ?, invite_code = ?, notice = ?, first_prize_num = ?, second_prize_num = ?, third_prize_num = ?, quiz_date = ?
      WHERE id = ?`,
      [name, invite_code, notice, first_prize_num, second_prize_num, third_prize_num, quiz_date, id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '更新失败' });
  }
});

// 获取题目列表接口
router.get('/:id/questions', async (req, res) => {
  try {
    const { id } = req.params;
    const [questions] = await pool.query(
      `SELECT id, type, content, score, lowestScore, time_limit, options, answer
      FROM questions
      WHERE quiz_id = ?
      ORDER BY id`,
      [id]
    );

    res.json({
      data: questions.map(q => ({
        ...q,
        options: JSON.parse(q.options),
        answer: JSON.parse(q.answer)
      }))
    });

  } catch (error) {
    res.status(500).json({ error: '获取失败' });
  }
});

// 获取提交列表借口

router.get('/:id/submissions', requireAuth, async (req, res) => {
  const questionId = req.params.id;
  const userId = req.session.user.id;
  console.log(`GET /quiz/${questionId}/submissions ${questionId} ${userId}`);
  // console.log(questionId, userId);
  // console.log(typeof userId);
  try {
    const [submissions] = await pool.query(
      `SELECT * FROM submissions WHERE user_id = ? AND question_id = ?`,
      [userId, questionId]
    );
    console.log(submissions);
    if (submissions.length == 0) {
      return res.status(400).json({ error: '未作答' });
    }
    res.json({
      data: submissions[0]
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: '获取失败' });
  }
});

// 删除题目接口
router.delete('/:id/questions', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;

    await connection.query(
      'DELETE FROM questions WHERE quiz_id = ?',
      [id]
    );

    await connection.commit();
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: '删除失败' });
  } finally {
    connection.release();
  }
});

// 解析选项范围（保持不变）
const parseOptions = (input) => {
  if (!input) return [];

  const rangeMatch = input.match(/^([A-Z])-([A-Z])$/i);
  if (rangeMatch) {
    const start = rangeMatch[1].toUpperCase().charCodeAt(0);
    const end = rangeMatch[2].toUpperCase().charCodeAt(0);
    return Array.from({ length: end - start + 1 }, (_, i) =>
      String.fromCharCode(start + i)
    );
  }

  if (/^[A-Z]+$/i.test(input)) {
    return input.toUpperCase().split('');
  }

  return input.split(',').flatMap(item => {
    const singleMatch = item.match(/^([A-Z])$/i);
    if (singleMatch) return [singleMatch[1].toUpperCase()];

    const rangeMatch = item.match(/^([A-Z])-([A-Z])$/i);
    if (rangeMatch) {
      const start = rangeMatch[1].toUpperCase().charCodeAt(0);
      const end = rangeMatch[2].toUpperCase().charCodeAt(0);
      return Array.from({ length: end - start + 1 }, (_, i) =>
        String.fromCharCode(start + i)
      );
    }
    return [];
  });
};

// 新增按列索引解析的逻辑
const parseQuestionByIndex = (row) => ({
  type: row[0]?.toString().trim() || '',       // 第1列：题型
  score: row[1],                               // 第2列：分值
  lowestScore: row[2],                         // 第3列：最低分值
  timeLimit: row[3],                           // 第4列：时间限制
  content: row[4]?.toString().trim() || '',    // 第5列：题目内容
  optionsRange: row[5]?.toString().trim() || '',// 第6列：选项范围
  correctAnswer: row[6]?.toString().trim() || '' // 第7列：正确答案
});

// 修改后的验证逻辑
const validateQuestion = (q) => {
  const errors = [];

  if (!['单选题', '多选题', '填空题'].includes(q.type)) {
    errors.push(`无效题型: ${q.type}`);
  }

  if (isNaN(q.score) || q.score < 0) {
    errors.push(`无效分值: ${q.score}`);
  }

  if (isNaN(q.score) || q.lowestScore < 0) {
    errors.push(`无效最小分值: ${q.lowestScore}`);
  }

  if (q.lowestScore > q.score) {
    errors.push(`最低分值不能大于分值`);
  }

  if (isNaN(q.timeLimit) || q.timeLimit <= 0) {
    errors.push(`时间限制必须为大于0的数字`);
  }

  if (q.type !== '填空题' && !/^([A-Z]([-][A-Z])?)(,[A-Z]([-][A-Z])?)*$/.test(q.optionsRange)) {
    errors.push('选项范围格式错误');
  }

  if (!q.correctAnswer) {
    errors.push('必须指定正确答案');
  }

  return errors;
};

// 修改后的上传接口
router.post('/upload-questions',
  requireAuth,
  upload.single('excel'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' });
    }

    try {
      const quizId = req.body.quizId;
      const workbook = XLSX.readFile(req.file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      rows.shift(); // 移除标题行

      const validQuestions = [];
      const errors = [];

      rows.forEach((row, index) => {
        // 新增空行过滤逻辑
        const isEmptyRow = row.every(cell =>
          cell === null || cell === undefined || String(cell).trim() === ''
        );

        if (isEmptyRow) return; // 跳过空行

        if (row.length < 7) {
          errors.push(`第${index + 2}行: 数据列不完整（需要7列）`);
          return;
        }

        const q = parseQuestionByIndex(row);
        const lineErrors = validateQuestion(q);

        if (lineErrors.length > 0) {
          errors.push(`第${index + 2}行: ${lineErrors.join(', ')}`);
          return;
        }

        validQuestions.push({
          quiz_id: quizId,
          type: q.type,
          score: Number(q.score),
          lowestScore: Number(q.lowestScore),
          time_limit: parseFloat(q.timeLimit),
          content: q.content,
          options: q.type !== '填空题' ? parseOptions(q.optionsRange) : [],
          answer: q.correctAnswer.split(',').map(s => s.trim())
        });
      });

      if (errors.length > 0) {
        console.error('数据验证失败:', errors);
        return res.status(400).json({
          error: `数据验证失败`,
          details: errors
        });
      }

      const insertSQL = `INSERT INTO questions 
        (quiz_id, type, score, lowestScore, time_limit, content, options, answer) VALUES ?`;

      const values = validQuestions.map(q => [
        q.quiz_id,
        q.type,
        q.score,
        q.lowestScore,
        q.time_limit,
        q.content,
        JSON.stringify(q.options),
        JSON.stringify(q.answer)
      ]);

      const [result] = await pool.query(insertSQL, [values]);
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        added: result.affectedRows
      });

    } catch (error) {
      if (req.file) fs.unlinkSync(req.file.path);
      res.status(500).json({
        error: '服务器处理失败',
        detail: error.message
      });
    }
  }
);

// 在 quizRoutes.js 中添加以下路由
router.post('/new', requireAuth, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { name, invite_code, notice, first_prize_num, second_prize_num, third_prize_num, quiz_date } = req.body;

    // 基础验证
    if (!name || !invite_code || !quiz_date) {
      throw new Error('比赛名称、邀请码和比赛日期为必填项');
    }

    // 生成UUID
    const quizId = uuidv4();

    // 创建比赛
    await connection.query(
      `INSERT INTO quizzes SET
        id = ?,
        name = ?,
        invite_code = ?,
        notice = ?,
        status = 'pending',
        created_at = NOW(),
        first_prize_num = ?,
        second_prize_num = ?,
        third_prize_num = ?,
        quiz_date = ?`,
      [quizId, name, invite_code, notice, first_prize_num, second_prize_num, third_prize_num, quiz_date]
    );

    await connection.commit();

    res.json({
      success: true,
      id: quizId
    });

  } catch (error) {
    await connection.rollback();
    console.error('创建比赛错误:', error);
    res.status(400).json({
      error: error.message,
      code: 'CREATE_FAILED'
    });
  } finally {
    connection.release();
  }
});

router.post('/queryEndtime', requireAuth, (req, res) => {
  console.log(req.body);
  const { quizId } = req.body;
  console.log(quizId);
  global.quizSystem_io.sockets.to(quizId + '-admin').timeout(5000).emit('query-endtime', (err, response) => {
    try {
      if (err) {
        // console.error('error');
        // console.error(err);
        return res.status(500).json({ error: 'socket错误' });
      }
      else {
        console.log(response);
        return res.json({ endtime: response[0].endtime });
      }
    }
    catch (error) {
      console.error(error);
      return res.status(500).json({ error: '服务器内部错误' });
    }
  });
})

router.get('/:id/question_rank', requireAuth, async (req, res) => {
  const questionId = req.params.id;
  try {
    // 查找每个题目中用户的得分并按分数排序
    const [rank] = await pool.query(
      `SELECT * FROM question_rank WHERE question_id = ? ORDER BY score DESC`,
      [questionId]
    );

    res.json({
      success: true,
      rank,
      userId: req.session.user.id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/quiz_rank', requireAuth, async (req, res) => {
  const quizId = req.params.id;
  const userId = req.session.user.id;
  console.log(userId);
  try {
    // 查找每个题目中用户的得分并按分数排序
    const [rank] = await pool.query(
      `SELECT user_id, user_name, score FROM quiz_rank WHERE quiz_id = ? ORDER BY score DESC`,
      [quizId]
    );

    res.json({
      success: true,
      rank,
      userId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/verify/enter', requireAuth, async (req, res) => {
  try {
    const { quizId } = req.body;
    // console.log(req.session);
    if (!req.session.quizzes || !req.session.quizzes[quizId]) return res.status(403).json({ success: false, message: '无权查看' });
    else return res.json({ success: true });
  }
  catch (err) {
    console.error('error on verifyEnter:', err);
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

router.post('/verify/inviteCode', requireAuth, async (req, res) => {
  try {
    const { quizId, code } = req.body;
    const [quizzes] = await pool.query(`SELECT (invite_code) FROM quizzes WHERE id=?`, [quizId]);
    if (quizzes.length && quizzes[0].invite_code == code) {
      if (!req.session.quizzes) req.session.quizzes = new Object();
      if (!req.session.quizzes[quizId])
        await pool.query(`UPDATE quizzes SET participant_num=participant_num+1 WHERE id=?`, [quizId]);
      req.session.quizzes[quizId] = true;
      return res.json({ success: true });
    }
    else return res.status(403).json({ success: false, message: '邀请码错误' });
  }
  catch (err) {
    console.log('error on checkInviteCode:', err);
    return res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

router.post('/verify/identification', requireAuth, async (req, res) => {
  try {
    const [user] = await pool2.query(`SELECT (admin) FROM users WHERE id=?`, [req.session.user.id]);
    if (!user || user.length == 0) return res.status(500).json({ success: false, error: '用户不存在' });
    return res.json({ success: true, username: req.session.user.username, admin: user[0].admin });
  }
  catch (err) {
    console.error('error on verifyIdentification:', err);
    return res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

router.get('/:id', requireAuth, quizController.getQuizDetails);
router.get('/:id/start', requireAuth, quizController.startQuiz);
router.get('/:id/question', requireAuth, quizController.getQuestion);
router.post('/:id/end', requireAuth, quizController.endQuiz);
router.post('/submit', requireAuth, quizController.submitAnswer);

// 获取用户在比赛中的排名
async function getUserRank(quizId, userId) {
  const [rank] = await pool.query(
    `SELECT user_id FROM quiz_rank WHERE quiz_id = ? ORDER BY score DESC`,
    [quizId]
  );
  const userRank = rank.findIndex(r => r.user_id === userId) + 1;
  return { rank: userRank, total: rank.length };
}

// 格式化日期为中文格式
const formatDateToChinese = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 月份从0开始
  const day = d.getDate();
  return `${year}年${month}月${day}日`;
};

// 下载比赛证书
router.get('/:id/certificate', requireAuth, async (req, res) => {
  const quizId = req.params.id;
  const { id: userId, username, realname } = req.session.user;

  try {
    // 获取比赛信息
    const [quiz] = await pool.query(
      `SELECT first_prize_num, second_prize_num, third_prize_num, status, quiz_date 
       FROM quizzes WHERE id = ?`,
      [quizId]
    );

    if (!quiz.length) {
      return res.status(404).json({ error: '比赛不存在' });
    }

    const { first_prize_num, second_prize_num, third_prize_num, status, quiz_date } = quiz[0];

    // 检查比赛是否已结束
    if (status !== 'ended') {
      return res.status(403).json({ error: '比赛未结束，无法下载证书' });
    }

    // 获取用户排名
    const { rank, total } = await getUserRank(quizId, userId);

    // 检查用户是否参加比赛
    if (rank === 0) {
      return res.status(403).json({ error: '未参赛，无法下载证书' });
    }

    // 判断奖项
    let awardLevel = '参与奖';
    if (rank <= first_prize_num) {
      awardLevel = '一等奖';
    } else if (rank <= first_prize_num + second_prize_num) {
      awardLevel = '二等奖';
    } else if (rank <= first_prize_num + second_prize_num + third_prize_num) {
      awardLevel = '三等奖';
    }

    // 格式化比赛日期
    const formattedDate = formatDateToChinese(quiz_date);

    // 生成证书
    const outputFilePath = path.join(
      __dirname,
      `../public/certificates/certificate_${username}_${quizId}.pdf`
    );

    await generateCertificate({
      isDarkBackground: 0,
      username,
      realname,
      awardLevel,
      date: formattedDate, // 使用格式化后的日期
      outputFilePath
    });

    // 返回证书文件
    res.download(outputFilePath, `certificate_${username}_${quizId}.pdf`, err => {
      if (err) {
        console.error('证书下载失败:', err);
        res.status(500).json({ error: '证书下载失败' });
      }

      // 删除临时文件
      fs.unlink(outputFilePath, unlinkErr => {
        if (unlinkErr) console.error('删除证书文件失败:', unlinkErr);
      });
    });
  } catch (error) {
    console.error('生成证书失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
