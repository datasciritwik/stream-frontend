// Correct the import to use the proper export name
import { Rnnoise } from '@shiguredo/rnnoise-wasm';
// import { resample, float32ToWav } from './audioUtils.js';

// VAD Parameters (You can tune these later)
const SILENCE_DURATION_MS = 700;
const VAD_START_THRESHOLD = 0.8;
const VAD_END_THRESHOLD = 0.3;

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
            const rnnoise = await Rnnoise.load();
            const denoiseState = rnnoise.createDenoiseState();

            this.stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 48000, channelCount: 1, echoCancellation: true, noiseSuppression: true } });
            this.audioContext = new AudioContext();
            
            const source = this.audioContext.createMediaStreamSource(this.stream);
            const processor = this.audioContext.createScriptProcessor(512, 1, 1);

            processor.onaudioprocess = (e) => {
                if (this.isProcessing) return;

                const inputData = e.inputBuffer.getChannelData(0);
                const frame = inputData.slice(0, 480); // Extract the first 480 samples
                const vadScore = denoiseState.processFrame(frame);

                if (this.isSpeaking && vadScore < VAD_END_THRESHOLD) {
                    if (this.silenceStart === null) this.silenceStart = Date.now();

                    if (Date.now() - this.silenceStart > SILENCE_DURATION_MS) {
                        this.isProcessing = true;
                        this.isSpeaking = false;
                        const audioToProcess = [...this.utteranceBuffer];
                        this.utteranceBuffer = [];
                        console.log('Sending audio blob to backend:', audioToProcess);
                        this.onUtterance(audioToProcess);
                    }
                } else if (!this.isSpeaking && vadScore > VAD_START_THRESHOLD) {
                    this.isSpeaking = true;
                    this.silenceStart = null;
                    this.onStatusUpdate('Speech detected!', '#42b72a');
                    console.log('Speech detected!');
                }

                if (this.isSpeaking) {
                    this.utteranceBuffer.push(...inputData);
                    console.log('Buffering audio data:', this.utteranceBuffer);
                }
            };
            
            source.connect(processor);
            processor.connect(this.audioContext.destination);

            this.isActive = true;
            this.processor = processor;
            this.source = source;
            this.onStatusUpdate('Listening for speech...');

        } catch (err) {
            console.error('Error activating VAD:', err);
            this.onStatusUpdate('Error: Could not access microphone.', '#dc3545');
            this.stop();
        }
    }

    utteranceProcessed() {
        this.isProcessing = false;
        this.silenceStart = null;
        this.onStatusUpdate('Listening for speech...');
    }

    stop() {
        if (!this.isActive) return;
        
        if (this.stream) this.stream.getTracks().forEach(track => track.stop());
        if (this.source) this.source.disconnect();
        if (this.processor) this.processor.disconnect();
        if (this.audioContext) this.audioContext.close();
        
        this.isActive = false;
        this._resetState();
        this.onStatusUpdate('Click to activate microphone');
    }
}