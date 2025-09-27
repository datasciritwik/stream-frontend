// Updated vad.js with debug logs and lower thresholds
import { Rnnoise } from '@shiguredo/rnnoise-wasm';

// LOWERED THRESHOLDS FOR EASIER TRIGGERING
const SILENCE_DURATION_MS = 300;  // Reduced from 700ms
const VAD_START_THRESHOLD = 0.1;  // Reduced from 0.8
const VAD_END_THRESHOLD = 0.1;    // Reduced from 0.3

export class VADProcessor {
    constructor(onUtterance, onStatusUpdate) {
        this.onUtterance = onUtterance;
        this.onStatusUpdate = onStatusUpdate;
        this.isActive = false;
        this._resetState();
    }

    _resetState() {
        this.isSpeaking = false;
        this.isProcessing = false;
        this.silenceStart = null;
        this.utteranceBuffer = [];
        this.audioContext = null;
        this.stream = null;
    }

    async start() {
        if (this.isActive) return;
        this.onStatusUpdate('Initializing VAD model...');
        try {
            console.log('Loading RNNoise...');
            const rnnoise = await Rnnoise.load();
            console.log('RNNoise loaded successfully');
            const denoiseState = rnnoise.createDenoiseState();

            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { 
                    sampleRate: 48000, 
                    channelCount: 1, 
                    echoCancellation: true, 
                    noiseSuppression: true 
                } 
            });
            this.audioContext = new AudioContext();
            
            const source = this.audioContext.createMediaStreamSource(this.stream);
            const processor = this.audioContext.createScriptProcessor(512, 1, 1);

            processor.onaudioprocess = (e) => {
                if (this.isProcessing) return;

                const inputData = e.inputBuffer.getChannelData(0);
                const frame = inputData.slice(0, 480);
                const vadScore = denoiseState.processFrame(frame);

                // ADD DEBUG LOGGING
                if (vadScore > 0.1) { // Log any significant activity
                    console.log(`VAD Score: ${vadScore.toFixed(3)}, Speaking: ${this.isSpeaking}, Buffer size: ${this.utteranceBuffer.length}`);
                }

                if (this.isSpeaking && vadScore < VAD_END_THRESHOLD) {
                    if (this.silenceStart === null) {
                        this.silenceStart = Date.now();
                        console.log('Silence detected, starting timer...');
                    }

                    if (Date.now() - this.silenceStart > SILENCE_DURATION_MS) {
                        console.log('🎤 ENDING SPEECH - Processing utterance!');
                        this.isProcessing = true;
                        this.isSpeaking = false;
                        const audioToProcess = [...this.utteranceBuffer];
                        this.utteranceBuffer = [];
                        
                        console.log(`Sending ${audioToProcess.length} audio samples to backend`);
                        this.onUtterance(audioToProcess);
                    }
                } else if (!this.isSpeaking && vadScore > VAD_START_THRESHOLD) {
                    console.log('🗣️ SPEECH DETECTED! Starting recording...');
                    this.isSpeaking = true;
                    this.silenceStart = null;
                    this.onStatusUpdate('Speech detected!', '#42b72a');
                }

                if (this.isSpeaking) {
                    this.utteranceBuffer.push(...inputData);
                    // Log buffer growth every 1000 samples
                    if (this.utteranceBuffer.length % 1000 < 512) {
                        console.log(`Buffer growing: ${this.utteranceBuffer.length} samples`);
                    }
                }
            };
            
            source.connect(processor);
            processor.connect(this.audioContext.destination);

            this.isActive = true;
            this.processor = processor;
            this.source = source;
            this.onStatusUpdate('Listening for speech... (Try speaking now!)');
            
            // ADD SUCCESS LOG
            console.log('🎙️ VAD is now actively listening!');

        } catch (err) {
            console.error('Error activating VAD:', err);
            this.onStatusUpdate('Error: Could not access microphone.', '#dc3545');
            this.stop();
        }
    }

    utteranceProcessed() {
        console.log('✅ Utterance processed, ready for next speech');
        this.isProcessing = false;
        this.silenceStart = null;
        this.onStatusUpdate('Listening for speech... (Ready for next utterance)');
    }

    stop() {
        if (!this.isActive) return;
        
        console.log('🛑 Stopping VAD');
        if (this.stream) this.stream.getTracks().forEach(track => track.stop());
        if (this.source) this.source.disconnect();
        if (this.processor) this.processor.disconnect();
        if (this.audioContext) this.audioContext.close();
        
        this.isActive = false;
        this._resetState();
        this.onStatusUpdate('Click to activate microphone');
    }
}