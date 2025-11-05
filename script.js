document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const listenBtn = document.getElementById('listenBtn');
    const generateBtn = document.getElementById('generateBtn');
    const copyBtn = document.getElementById('copyBtn');
    const outputText = document.getElementById('outputText');
    const status = document.getElementById('status');
    const voiceSelect = document.getElementById('voice-select');
    const visualizerCanvas = document.getElementById('visualizer');
    const audioOutputContainer = document.getElementById('audio-output'); // Changed variable name

    // Web Speech API for HINDI
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'hi-IN'; // <<--- LANGUAGE CHANGED TO HINDI
    } else {
        updateStatus("क्षमा करें, आपका ब्राउज़र स्पीच रिकग्निशन का समर्थन नहीं करता है।", true);
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
        if (source) {
            source.disconnect();
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
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        canvasCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
    };
    
    const updateStatus = (message, isError = false) => {
        status.textContent = `स्थिति: ${message}`;
        status.style.color = isError ? '#ff6b6b' : 'var(--text-muted-color)';
    };

    if (recognition) {
        recognition.onstart = () => {
            isListening = true;
            listenBtn.querySelector('span').textContent = 'बंद करो';
            listenBtn.classList.add('listening');
            updateStatus('सुन रहा हूँ...');
        };

        recognition.onend = () => {
            isListening = false;
            listenBtn.querySelector('span').textContent = 'सुनो';
            listenBtn.classList.remove('listening');
            updateStatus('निष्क्रिय');
        };

        recognition.onerror = (event) => {
            updateStatus(`त्रुटि: ${event.error}`, true);
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
                .then(() => updateStatus('टेक्स्ट क्लिपबोर्ड पर कॉपी हो गया!'))
                .catch(() => updateStatus('टेक्स्ट कॉपी करने में विफल।', true));
        }
    });

    generateBtn.addEventListener('click', async () => {
        const textToSpeak = outputText.value;
        if (!textToSpeak.trim()) {
            updateStatus('खाली टेक्स्ट से आवाज उत्पन्न नहीं की जा सकती।', true);
            return;
        }

        generateBtn.disabled = true;
        generateBtn.querySelector('span').textContent = 'बना रहा है...';
        updateStatus('API से ऑडियो का अनुरोध किया जा रहा है...');
        audioOutputContainer.innerHTML = ''; // Clear previous player and button
        clearVisualizer();

        try {
            const response = await fetch('api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToSpeak, voice: voiceSelect.value }),
            });

            // *** ERROR HANDLING FIX ***
            if (!response.ok) {
                let errorMessage;
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    const errorData = await response.json();
                    errorMessage = errorData.detail.message || JSON.stringify(errorData);
                } else {
                    errorMessage = await response.text();
                }
                throw new Error(errorMessage);
            }

            updateStatus('ऑडियो स्ट्रीम हो रहा है...');
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Create Audio Player
            const audio = new Audio(audioUrl);
            audio.controls = true;
            audioOutputContainer.appendChild(audio);

            // *** CREATE DOWNLOAD BUTTON ***
            const downloadLink = document.createElement('a');
            downloadLink.href = audioUrl;
            downloadLink.download = 'generated_speech.mp3';
            downloadLink.className = 'download-btn';
            downloadLink.innerHTML = `<i class="fas fa-download"></i> डाउनलोड`;
            audioOutputContainer.appendChild(downloadLink);

            audio.play();
            setupVisualizer(audio);

            audio.onplay = () => updateStatus('ऑडियो चल रहा है...');
            audio.onended = () => {
                updateStatus('ऑडियो समाप्त।');
                clearVisualizer();
            };

        } catch (error) {
            console.error('आवाज उत्पन्न करने में त्रुटि:', error);
            updateStatus(`त्रुटि: ${error.message}`, true);
        } finally {
            generateBtn.disabled = false;
            generateBtn.querySelector('span').textContent = 'उत्पन्न करें';
        }
    });
});