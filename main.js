const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const particleContainer = document.getElementById('particle-container');

const botName = "AlexBot";
let isBotTyping = false;
let conversationContext = []; // Store last few messages {sender, text}

// Response Pools
const responses = {
    greetings: [
        "Hey there! How can I assist you today?",
        "Hi! What's on your mind?",
        "Hello, friend! Ready to chat?",
        "Greetings! I'm here to help."
    ],
    farewell: [
        "Catch you later!",
        "Bye for now! Feel free to return anytime.",
        "Take care! Have a great day.",
        "Goodbye! It was nice chatting."
    ],
    help: [
        "I can chat about various topics. Try asking me something!",
        "Just type your questions or statements, and I'll do my best to respond.",
        "Need assistance? Tell me what you're looking for.",
        "I'm a simple chatbot. You can say 'hello', 'bye', or ask simple questions."
    ],
    feedback_yes: [
        "Great! Glad I could help.",
        "Awesome! I'm getting good at this.",
        "Excellent! What else can I do for you?",
        "Perfect! Let me know if there's anything else."
    ],
    feedback_no: [
        "Ah, okay. Could you please rephrase or provide more detail?",
        "My apologies. What did I misunderstand?",
        "Hmm, I see. Can you explain what you were looking for?",
        "Sorry about that. Please tell me more so I can improve."
    ],
    default: [
        "Interesting! Tell me more.",
        "Hmm, I understand.",
        "That's quite fascinating.",
        "Got it. What else?",
        "Okay, processing that...",
        "Let me think about that for a moment."
    ]
};

// --- Core Functions ---

function formatTimestamp(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    // Manually set the date part to April 01, 2025 for consistency with prompt requirement
    const displayDate = new Date(date);
    displayDate.setFullYear(2025);
    displayDate.setMonth(3); // April is month 3 (0-indexed)
    displayDate.setDate(1);
    return displayDate.toLocaleString('en-US', options);
}

function scrollToBottom() {
    // Use requestAnimationFrame for potentially smoother scrolling
    requestAnimationFrame(() => {
         chatWindow.scrollTop = chatWindow.scrollHeight;
    });
}

function displayMessage(text, sender, skipAnimation = false) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    messageDiv.setAttribute('role', 'listitem'); // For accessibility

    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    contentDiv.textContent = text; // Use textContent for security

    const timestampSpan = document.createElement('span');
    timestampSpan.classList.add('timestamp');
    timestampSpan.textContent = formatTimestamp(new Date());

    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timestampSpan);

     if (skipAnimation) {
         messageDiv.style.opacity = 1;
         messageDiv.style.transform = 'translateY(0)';
    }

    chatWindow.appendChild(messageDiv);
    updateConversationContext(sender, text);
    scrollToBottom();
    return messageDiv; // Return for potential modification (like adding typing cursor)
}

function displayTypingIndicator() {
    if (document.querySelector('.typing-indicator')) return; // Already exists

    isBotTyping = true;
    toggleInput(false); // Disable input

    const indicatorDiv = document.createElement('div');
    indicatorDiv.classList.add('typing-indicator');
    indicatorDiv.setAttribute('aria-label', `${botName} is typing`);
    indicatorDiv.setAttribute('role', 'status');

    const thinkingSpan = document.createElement('span');
    thinkingSpan.textContent = `${botName} is thinking`;
    indicatorDiv.appendChild(thinkingSpan);


    for (let i = 0; i < 3; i++) {
        const dotSpan = document.createElement('span');
        dotSpan.classList.add('dot');
        indicatorDiv.appendChild(dotSpan);
    }

    chatWindow.appendChild(indicatorDiv);
    scrollToBottom();
}

function removeTypingIndicator() {
     const indicator = chatWindow.querySelector('.typing-indicator');
     if (indicator) {
         indicator.remove();
     }
     isBotTyping = false;
     // Don't re-enable input here, wait until bot message is fully typed
}

function typeBotMessage(text) {
    removeTypingIndicator();

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'bot-message');
    messageDiv.setAttribute('role', 'listitem');

    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    // Add initial hidden character for consistent height calculation if needed
    contentDiv.innerHTML = '&nbsp;';

    const timestampSpan = document.createElement('span');
    timestampSpan.classList.add('timestamp');
    // Timestamp will be set at the end

    const cursorSpan = document.createElement('span');
    cursorSpan.classList.add('typing-cursor');
    contentDiv.appendChild(cursorSpan); // Add cursor initially

    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timestampSpan); // Add timestamp holder

    chatWindow.appendChild(messageDiv);
    scrollToBottom(); // Scroll once initially

    let charIndex = 0;
    contentDiv.innerHTML = ''; // Clear the placeholder space

    function typeCharacter() {
        if (charIndex < text.length) {
            contentDiv.innerHTML = text.substring(0, charIndex + 1) + '<span class="typing-cursor"></span>';
            charIndex++;
            scrollToBottom(); // Scroll as text grows, potentially throttle this if performance suffers
            const randomDelay = Math.floor(Math.random() * (100 - 30 + 1)) + 30; // 30-100ms delay
            setTimeout(typeCharacter, randomDelay);
        } else {
            // Typing finished
            contentDiv.innerHTML = text; // Remove cursor
            timestampSpan.textContent = formatTimestamp(new Date()); // Add final timestamp
            updateConversationContext('bot', text);
            addFeedbackButtons(messageDiv); // Add feedback after message is complete
            toggleInput(true); // Re-enable input
            scrollToBottom(); // Final scroll
        }
    }

    // Slight delay before starting typing for effect
    setTimeout(typeCharacter, 300);
}


function addFeedbackButtons(messageDiv) {
     // Check if the last message was already a feedback response
    const lastBotMsgData = conversationContext.filter(m => m.sender === 'bot').pop();
     if (lastBotMsgData && Object.values(responses.feedback_yes).concat(Object.values(responses.feedback_no)).includes(lastBotMsgData.text)) {
         return; // Don't add feedback buttons to feedback responses
    }

    const feedbackContainer = document.createElement('div');
    feedbackContainer.classList.add('feedback-container');

    const yesButton = document.createElement('button');
    yesButton.textContent = '👍 Helpful';
    yesButton.classList.add('feedback-button');
    yesButton.dataset.feedback = 'yes';

    const noButton = document.createElement('button');
    noButton.textContent = '👎 Not helpful';
    noButton.classList.add('feedback-button');
    noButton.dataset.feedback = 'no';

    feedbackContainer.appendChild(yesButton);
    feedbackContainer.appendChild(noButton);

    // Append directly to chatWindow, but visually associated with the last bot message
    chatWindow.appendChild(feedbackContainer);
    scrollToBottom();
}


function handleFeedback(event) {
    const target = event.target;
    if (target.classList.contains('feedback-button')) {
        const feedbackType = target.dataset.feedback;
        const container = target.closest('.feedback-container');

        if (container) {
            container.remove(); // Remove buttons immediately
        }

        let followUpResponsePool;
        if (feedbackType === 'yes') {
            followUpResponsePool = responses.feedback_yes;
        } else {
            followUpResponsePool = responses.feedback_no;
        }

        const botResponse = getRandomResponse(followUpResponsePool);
        simulateBotResponse(botResponse); // Use simulation for consistency
    }
}


function getRandomResponse(pool) {
    return pool[Math.floor(Math.random() * pool.length)];
}

function getBotResponse(userInputText) {
    const lowerInput = userInputText.toLowerCase().trim();

    // Simple keyword detection (can be expanded)
    if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('hey')) {
        return getRandomResponse(responses.greetings);
    } else if (lowerInput.includes('bye') || lowerInput.includes('goodbye') || lowerInput.includes('see ya')) {
        return getRandomResponse(responses.farewell);
    } else if (lowerInput.includes('help') || lowerInput.includes('assist') || lowerInput.includes('what can you do')) {
        return getRandomResponse(responses.help);
    }

    // Basic Context Check: Avoid immediate repetition
    const lastBotMessage = conversationContext.filter(m => m.sender === 'bot').pop()?.text;
    let potentialResponse;
    let tries = 0;
    do {
        potentialResponse = getRandomResponse(responses.default);
        tries++;
    } while (potentialResponse === lastBotMessage && tries < 5); // Try up to 5 times to avoid repeat

    return potentialResponse;
}

function simulateBotResponse(predefinedResponse = null) {
    displayTypingIndicator();

    // Simulate "thinking" time
    const thinkingTime = Math.floor(Math.random() * (1500 - 500 + 1)) + 500; // 0.5s to 1.5s

    setTimeout(() => {
        const botResponseText = predefinedResponse || getBotResponse(conversationContext.findLast(m => m.sender === 'user')?.text || "");
        typeBotMessage(botResponseText);
    }, thinkingTime);
}

function handleUserInput() {
    const text = userInput.value.trim();
    if (text && !isBotTyping) {
        // Remove any existing feedback buttons before user sends new message
         const existingFeedback = chatWindow.querySelector('.feedback-container');
         if (existingFeedback) {
             existingFeedback.remove();
         }

        displayMessage(text, 'user');
        userInput.value = '';
        autoResizeTextarea(); // Reset height after clearing
        simulateBotResponse();
    }
     userInput.focus(); // Keep focus on input
}

function handleKeyPress(event) {
    // Send on Enter, but allow Shift+Enter for new lines
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault(); // Prevent default newline behavior
        handleUserInput();
    }
}

function autoResizeTextarea() {
    // Reset height to auto to shrink if text is deleted
    userInput.style.height = 'auto';
    // Set height based on scroll height, respecting max-height from CSS
    userInput.style.height = `${userInput.scrollHeight}px`;
}

function toggleInput(enabled) {
    userInput.disabled = !enabled;
    sendButton.disabled = !enabled;
     if (!enabled) {
         userInput.placeholder = `${botName} is responding...`;
     } else {
         userInput.placeholder = "Type your message...";
     }
}

function updateConversationContext(sender, text) {
    conversationContext.push({ sender, text });
    // Keep only the last, say, 6 messages for context (3 user, 3 bot)
    if (conversationContext.length > 6) {
        conversationContext.shift(); // Remove the oldest message
    }
}

 // --- Particle Background ---
function createParticles(count = 25) {
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');

        // Random initial position and animation parameters
        const startX = Math.random() * 100;
        const startY = Math.random() * 100;
        const endX = (Math.random() - 0.5) * 2 * 50; // Random horizontal distance +/- 50px
        const endY = (Math.random() - 0.5) * 2 * 50; // Random vertical distance +/- 50px
        const duration = 15 + Math.random() * 10; // 15-25 seconds duration
        const delay = Math.random() * 15; // Stagger start times up to 15s

        particle.style.left = `${startX}%`;
        particle.style.top = `${startY}%`;
        particle.style.setProperty('--tx', `${endX}px`);
        particle.style.setProperty('--ty', `${endY}px`);
        particle.style.animationDuration = `${duration}s`;
        particle.style.animationDelay = `-${delay}s`; // Negative delay starts partway through animation

        particleContainer.appendChild(particle);
    }
}


// --- Initialization ---
function initializeChat() {
    // Initial greeting from the bot
    const initialGreeting = getRandomResponse(responses.greetings);
    // Use a slight delay for the greeting to allow page render
    setTimeout(() => {
         // Display initial message without typing effect for faster start
         // displayMessage(initialGreeting, 'bot', true); // Option 1: Skip typing
         // toggleInput(true); // Enable immediately if skipping typing

         // Option 2: Use typing effect for initial message
        isBotTyping = true; // Mark as typing initially
        toggleInput(false); // Keep input disabled
         typeBotMessage(initialGreeting);
    }, 500); // 0.5s delay

    // Set up event listeners
    sendButton.addEventListener('click', handleUserInput);
    userInput.addEventListener('keydown', handleKeyPress);
    userInput.addEventListener('input', autoResizeTextarea); // Handle dynamic height
     // Use event delegation for feedback buttons
     chatWindow.addEventListener('click', handleFeedback);

    // Create background particles
    createParticles();

    userInput.focus(); // Focus input on load
}

// Start the chatbot when the DOM is ready
// Use DOMContentLoaded which fires after the HTML is parsed,
// ensuring elements are available before the script tries to access them.
// This is crucial when the script is external or loaded in the <head>.
document.addEventListener('DOMContentLoaded', initializeChat);