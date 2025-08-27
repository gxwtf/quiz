const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function generateCertificate({
    backgroundImage = 'background1.jpg',
    isDarkBackground = 0,
    username,
    realname,
    date = '2025年8月27日',
    awardLevel,
    outputFilePath = 'certificate.pdf'
}) {
    const pageWidth = 1920;
    const pageHeight = 1080;

    const doc = new PDFDocument({
        size: [pageWidth, pageHeight],
        margins: { top: 0, left: 0, bottom: 0, right: 0 }
    });

    try {
        const stream = fs.createWriteStream(outputFilePath);
        doc.pipe(stream);

        // 确保背景图片路径正确
        const backgroundImagePath = path.resolve(__dirname, backgroundImage);
        if (fs.existsSync(backgroundImagePath)) {
            doc.image(backgroundImagePath, 0, 0, {
                width: pageWidth,
                height: pageHeight,
                fit: [pageWidth, pageHeight]
            });
        } else {
            console.warn(`背景图片未找到: ${backgroundImagePath}`);
        }

        // 颜色配置
        const textColor = isDarkBackground ? '#FFFFFF' : '#2c1608';
        const awardColor = '#c59d5c';

        doc.fillColor(textColor);

        // 确保字体路径正确
        const titleFontPath = path.resolve(__dirname, 'font1.ttf');
        const mainFontPath = path.resolve(__dirname, 'font2.ttf');
        const awardFontPath = path.resolve(__dirname, 'font3.ttf');

        doc.registerFont('titleFont', titleFontPath);
        doc.registerFont('mainFont', mainFontPath);
        doc.registerFont('awardFont', awardFontPath);

        const contentZone = {
            width: pageWidth * 0.55,
            padding: {
                left: 50,
                right: 50,
                top: 100
            }
        };

        const availableWidth = contentZone.width - contentZone.padding.left - contentZone.padding.right;
        let yPosition = contentZone.padding.top;
        const lineHeight = 72;
        const paragraphSpacing = 40;

        // 主标题
        doc.font('titleFont').fontSize(120);
        const title = "奖  状";
        const titleX = contentZone.padding.left + (availableWidth - doc.widthOfString(title)) / 2;
        doc.text(title, titleX, yPosition);
        yPosition += 210;

        // 用户信息
        const userText = `用户名为 ${username} 的 ${realname} 同学：`;
        doc.font('mainFont').fontSize(42)
            .text(userText, contentZone.padding.left, yPosition, {
                width: availableWidth,
                lineGap: lineHeight * 0.3
            });
        yPosition += (doc.heightOfString(userText, { width: availableWidth }) || lineHeight) + paragraphSpacing;

        // 获奖说明
        const descText = '在2025年“广学知识竞赛”中表现优异，荣获';
        doc.fontSize(42)
            .text(descText, contentZone.padding.left, yPosition, {
                width: availableWidth,
                lineGap: lineHeight * 0.3
            });
        yPosition += (doc.heightOfString(descText, { width: availableWidth }) || lineHeight) + 2 * paragraphSpacing;

        // 奖项等级
        doc.font('awardFont').fontSize(100)
            .fillColor(awardColor)  // 根据背景切换颜色
            .text(awardLevel, contentZone.padding.left + (availableWidth - doc.widthOfString(awardLevel)) / 2, yPosition)
            .fillColor(textColor);
        yPosition += 100 + 2 * paragraphSpacing;

        // 鼓励语
        const encourageText = '特发此证，以资鼓励';
        doc.font('mainFont').fontSize(42)
            .text(encourageText, contentZone.padding.left, yPosition, {
                width: availableWidth,
                lineGap: lineHeight * 0.3
            });
        yPosition += (doc.heightOfString(encourageText, { width: availableWidth }) || lineHeight) + paragraphSpacing;

        // 日期
        doc.fontSize(40)
            .text(date, contentZone.padding.left + availableWidth - doc.widthOfString(date), yPosition);

        doc.end();

        return new Promise((resolve, reject) => {
            stream.on('finish', () => resolve(outputFilePath));
            stream.on('error', reject);
        });

    } catch (error) {
        doc.end();
        throw error;
    }
}

module.exports = generateCertificate;