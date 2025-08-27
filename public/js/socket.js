function startQuiz(arg) {
  ;
}
function questionUpdate(arg) {
  ;
}
function questionStop(arg) {
  ;
}
const socket = io();
socket.on('quiz-start', (arg) => { startQuiz(arg); });
socket.on('question-update', (arg) => { questionUpdate(arg); });
socket.on('question-stop', (arg) => { questionStop(arg); });