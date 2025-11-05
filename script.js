document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const listenBtn = document.getElementById('listenBtn');
    const generateBtn = document.getElementById('generateBtn');
    const copyBtn = document.getElementById('copyBtn');
    const outputText = document.getElementById('outputText');
    const status = document.getElementById('status');
    const voiceSelect = document.getElementById('voice-select');
    const visualizerCanvas = document.getElementById('visualizer');
    const audioOutputContainer = document.getElementById('audio-output');

    // Web Speech API for HINDI output
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'hi-IN'; // <-- Set to Hindi for direct Hindi speech recognition
    } else {
        updateStatus("Sorry, your browser doesn't support speech recognition.", true);
        listenBtn.disabled = true;
    }

    let isListening = false;
    let finalTranscript = '';

    // Audio Visualizer (No changes here, it remains the same)
    let audioContext, analyser, source, dataArray, animationFrameId;
    const canvasCtx = visualizerCanvas.getContext('2d');
    const setupVisualizer = (audioElement) => { if (!audioContext) { audioContext = new (window.AudioContext || window.webkitAudioContext)(); analyser = audioContext.createAnalyser(); analyser.fftSize = 256; } if (source) { source.disconnect(); } source = audioContext.createMediaElementSource(audioElement); source.connect(analyser); analyser.connect(audioContext.destination); const bufferLength = analyser.frequencyBinCount; dataArray = new Uint8Array(bufferLength); drawVisualizer(); };
    const drawVisualizer = () => { animationFrameId = requestAnimationFrame(drawVisualizer); analyser.getByteFrequencyData(dataArray); canvasCtx.fillStyle = '#121212'; canvasCtx.fillRect(0, 0, visualizerCanvas.width, visualizerCanvas.height); const barWidth = (visualizerCanvas.width / dataArray.length) * 1.5; let barHeight; let x = 0; for (let i = 0; i < dataArray.length; i++) { barHeight = dataArray[i] / 2; const gradient = canvasCtx.createLinearGradient(0, 0, 0, visualizerCanvas.height); gradient.addColorStop(0, '#00aaff'); gradient.addColorStop(1, '#0055ff'); canvasCtx.fillStyle = gradient; canvasCtx.fillRect(x, visualizerCanvas.height - barHeight, barWidth, barHeight); x += barWidth + 1; } };
    const clearVisualizer = () => { if (animationFrameId) { cancelAnimationFrame(animationFrameId); } canvasCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height); };
    
    // Status updates are now in English
    const updateStatus = (message, isError = false) => {
        status.textContent = `Status: ${message}`;
        status.style.color = isError ? '#ff6b6b' : 'var(--text-muted-color)';
    };

    if (recognition) {
        recognition.onstart = () => {
            isListening = true;
            listenBtn.querySelector('span').textContent = 'Stop';
            listenBtn.classList.add('listening');
            updateStatus('Listening...');
        };

        recognition.onend = () => {
            isListening = false;
            listenBtn.querySelector('span').textContent = 'Speak';
            listenBtn.classList.remove('listening');
            updateStatus('Idle');
        };

        recognition.onerror = (event) => {
            updateStatus(`Error: ${event.error}`, true);
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            finalTranscript = '';
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

    listenBtn.addEventListener('click', () => {
        if (isListening) {
            recognition.stop();
        } else {
            finalTranscript = '';
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

        generateBtn.disabled = false;
        generateBtn.querySelector('span').textContent = 'Generating...';
        updateStatus('Requesting audio from API...');
        audioOutputContainer.innerHTML = '';
        clearVisualizer();

        try {
            const response = await fetch('api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToSpeak, voice: voiceSelect.value }),
            });

            if (!response.ok) {
                let errorMessage;
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    const errorData = await response.json();
                    errorMessage = errorData.detail?.message || JSON.stringify(errorData);
                } else {
                    errorMessage = await response.text();
                }
                throw new Error(errorMessage);
            }

            updateStatus('Streaming audio...');
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            
            const audio = new Audio(audioUrl);
            audio.controls = true;
            audioOutputContainer.appendChild(audio);

            const downloadLink = document.createElement('a');
            downloadLink.href = audioUrl;
            downloadLink.download = 'generated_speech.mp3';
            downloadLink.className = 'download-btn';
            downloadLink.innerHTML = `<i class="fas fa-download"></i> Download`;
            audioOutputContainer.appendChild(downloadLink);

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