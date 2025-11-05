document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const listenBtn = document.getElementById('listenBtn');
    const generateBtn = document.getElementById('generateBtn');
    const copyBtn = document.getElementById('copyBtn');
    const outputText = document.getElementById('outputText');
    const status = document.getElementById('status');
    const voiceSelect = document.getElementById('voice-select');
    const visualizerCanvas = document.getElementById('visualizer');
    const audioPlayerContainer = document.getElementById('audio-player-container');

    // Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
    } else {
        updateStatus("Speech recognition is not supported by your browser.", true);
        listenBtn.disabled = true;
    }

    let isListening = false;
    let finalTranscript = '';

    // Audio Visualizer
    let audioContext, analyser, source, dataArray, animationFrameId;
    const canvasCtx = visualizerCanvas.getContext('2d');

    const setupVisualizer = (audioElement) => {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
        }

        source = audioContext.createMediaElementSource(audioElement);
        source.connect(analyser);
        analyser.connect(audioContext.destination);

        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        drawVisualizer();
    };

    const drawVisualizer = () => {
        animationFrameId = requestAnimationFrame(drawVisualizer);
        analyser.getByteFrequencyData(dataArray);

        canvasCtx.fillStyle = '#121212';
        canvasCtx.fillRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);

        const barWidth = (visualizerCanvas.width / dataArray.length) * 1.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
            barHeight = dataArray[i] / 2;
            const gradient = canvasCtx.createLinearGradient(0, 0, 0, visualizerCanvas.height);
            gradient.addColorStop(0, '#00aaff');
            gradient.addColorStop(1, '#0055ff');
            canvasCtx.fillStyle = gradient;
            canvasCtx.fillRect(x, visualizerCanvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    };

    const clearVisualizer = () => {
        cancelAnimationFrame(animationFrameId);
        canvasCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
    };
    
    // Update Status Function
    const updateStatus = (message, isError = false) => {
        status.textContent = `Status: ${message}`;
        status.style.color = isError ? '#ff6b6b' : 'var(--text-muted-color)';
    };

    // Speech Recognition Handlers
    if (recognition) {
        recognition.onstart = () => {
            isListening = true;
            listenBtn.querySelector('span').textContent = 'Stop';
            listenBtn.classList.add('listening');
            updateStatus('Listening...');
        };

        recognition.onend = () => {
            isListening = false;
            listenBtn.querySelector('span').textContent = 'Listen';
            listenBtn.classList.remove('listening');
            updateStatus('Idle');
        };

        recognition.onerror = (event) => {
            updateStatus(`Error: ${event.error}`, true);
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            finalTranscript = ''; // Reset final transcript
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            outputText.value = finalTranscript.trim() + interimTranscript;

            if (outputText.value.trim().length > 0) {
                generateBtn.disabled = false;
                copyBtn.disabled = false;
            } else {
                generateBtn.disabled = true;
                copyBtn.disabled = true;
            }
        };
    }

    // Event Listeners
    listenBtn.addEventListener('click', () => {
        if (isListening) {
            recognition.stop();
        } else {
            finalTranscript = ''; // Clear transcript on new start
            outputText.value = '';
            recognition.start();
        }
    });

    copyBtn.addEventListener('click', () => {
        if (outputText.value) {
            navigator.clipboard.writeText(outputText.value)
                .then(() => updateStatus('Text copied to clipboard!'))
                .catch(() => updateStatus('Failed to copy text.', true));
        }
    });

    generateBtn.addEventListener('click', async () => {
        const textToSpeak = outputText.value;
        if (!textToSpeak.trim()) {
            updateStatus('Cannot generate speech from empty text.', true);
            return;
        }

        generateBtn.disabled = true;
        generateBtn.querySelector('span').textContent = 'Generating...';
        updateStatus('Requesting audio from API...');

        try {
            const response = await fetch('api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToSpeak, voice: voiceSelect.value }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            updateStatus('Streaming audio...');
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            
            audioPlayerContainer.innerHTML = ''; // Clear previous player
            const audio = new Audio(audioUrl);
            audio.controls = true;
            audioPlayerContainer.appendChild(audio);

            audio.play();
            setupVisualizer(audio);

            audio.onplay = () => updateStatus('Playing audio...');
            audio.onended = () => {
                updateStatus('Audio finished.');
                clearVisualizer();
            };

        } catch (error) {
            console.error('Error generating speech:', error);
            updateStatus(`Error: ${error.message}`, true);
        } finally {
            generateBtn.disabled = false;
            generateBtn.querySelector('span').textContent = 'Generate';
        }
    });
});