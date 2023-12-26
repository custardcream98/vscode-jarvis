export const getWebviewContent = ({ nonce }: { nonce: string }) => {
  return `
<h1>Jarvis</h1>
<p>Ask a question</p>

<form id="questionForm">
<textarea id="question" type="text" placeholder="What is the purpose of this project?"></textarea>
<button id="ask">Ask</button>
</form>

<ol id="answerList" style="margin-top:20px;"></ol>

<script nonce="${nonce}">
const formElement = document.getElementById('questionForm');

formElement.addEventListener('submit', (e) => {
  e.preventDefault();

  const question = document.getElementById('question').value;

  tsvscode.postMessage({
    type: 'onQuestion',
    value: question
  });
});
</script>
<script nonce="${nonce}">
window.addEventListener('message', event => {
  const message = event.data;

  switch (message.type) {
    case 'onAnswer': {
      const answerListElement = document.getElementById('answerList');

      const answerElement = document.createElement('li');
      answerElement.innerText = message.value;

      answerListElement.appendChild(answerElement);

      break;
    }
  }
});
</script>  
`;
};
