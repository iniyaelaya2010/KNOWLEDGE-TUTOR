const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const suggestionChips = document.querySelectorAll('.suggestion-chip');
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');

const PROXY_URL = 'https://vibe-proxy-gqv4.onrender.com/v1/chat/completions';
const PROXY_HEADERS = {
  'Content-Type': 'application/json',
  Authorization: 'Bearer sk-vibe-summer-2026',
};

let attachedImageDataUrl = null;
let attachedImageName = '';

function addMessage(text, type) {
  const message = document.createElement('div');
  message.className = `message ${type}`;
  message.textContent = text;
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function updateImagePreview() {
  if (!attachedImageDataUrl) {
    imagePreview.classList.add('hidden');
    imagePreview.innerHTML = '';
    return;
  }

  imagePreview.classList.remove('hidden');
  imagePreview.innerHTML = `
    <img src="${attachedImageDataUrl}" alt="Attached preview" />
    <span>${attachedImageName || 'Attached image'}</span>
    <button class="remove-image" type="button">Remove</button>
  `;

  imagePreview.querySelector('.remove-image').addEventListener('click', () => {
    attachedImageDataUrl = null;
    attachedImageName = '';
    imageInput.value = '';
    updateImagePreview();
  });
}

function setSendingState(isSending) {
  sendButton.disabled = isSending;
  sendButton.textContent = isSending ? 'Sending...' : 'Send';
  userInput.disabled = isSending;
}

// This function sends the user's prompt to the classroom proxy server using a
// standard fetch() POST request and then returns the AI reply.
async function getTutorReply(message, imageUrl) {
  const instruction =
    'You are Knowledge Tutor. Give accurate homework help. From now on, always organise your responses for maximum readability. Follow these formatting rules: Start with a one-sentence direct answer when appropriate. Use clear headings with ##. Break information into short paragraphs of 1-3 sentences. Use bullet points or numbered lists instead of long blocks of text. Bold important terms, key actions, warnings, and conclusions. Avoid repeating information. Keep explanations concise while still being complete. If the answer contains steps, number them. Put examples in separate "Example" sections. Put tips or warnings in callout-style sections beginning with **Tip:**, **Note:**, or **Warning:**. Leave a blank line between sections. Never produce long walls of text. Prioritise clarity over sounding formal. If the response is longer than 300 words, include a brief summary at the end. Preferred structure: # Short Answer, ## Details, ## Steps, ## Example, ## Summary.';

  const requestBody = {
    model: 'class-chat-model',
    messages: [
      { role: 'system', content: instruction },
      {
        role: 'user',
        content: imageUrl
          ? [
              { type: 'text', text: `User asked: ${message}` },
              { type: 'image_url', image_url: { url: imageUrl } },
            ]
          : `User asked: ${message}`,
      },
    ],
  };

  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: PROXY_HEADERS,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const data = await response.json();

  // The proxy returns the reply inside the response path:
  // data.choices[0].message.content
  const reply = data?.choices?.[0]?.message?.content;
  return typeof reply === 'string' ? reply.trim() : 'The tutor is thinking. Please try again.';
}

async function sendMessage() {
  const value = userInput.value.trim();

  if (!value) {
    return;
  }

  addMessage(value, 'user');
  userInput.value = '';

  const typing = document.createElement('div');
  typing.className = 'message bot';
  typing.textContent = 'Thinking...';
  chatMessages.appendChild(typing);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  setSendingState(true);

  try {
    const reply = await getTutorReply(value, attachedImageDataUrl);
    typing.remove();
    addMessage(reply, 'bot');
  } catch (error) {
    typing.remove();
    addMessage('The tutor hit a snag. Please try again in a moment.', 'bot');
    console.error(error);
  } finally {
    setSendingState(false);
    attachedImageDataUrl = null;
    attachedImageName = '';
    imageInput.value = '';
    updateImagePreview();
    userInput.focus();
  }
}

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
});

sendButton.addEventListener('click', (event) => {
  event.preventDefault();
  sendMessage();
});

userInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
  }
});

suggestionChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    userInput.value = chip.textContent;
    userInput.focus();
  });
});

imageInput.addEventListener('change', (event) => {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    attachedImageDataUrl = reader.result;
    attachedImageName = file.name;
    updateImagePreview();
  };
  reader.readAsDataURL(file);
});

updateImagePreview();
addMessage('Hi! I am Knowledge Tutor. Ask me anything about your homework and I will help in a bright, fun way.', 'bot');
