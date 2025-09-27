const FASTAPI_ENDPOINT = "http://127.0.0.1:8000/upload-audio/";

export async function uploadAudio(wavBlob) {
    const formData = new FormData();
    formData.append("audio", wavBlob, "utterance.wav");

    try {
        const response = await fetch(FASTAPI_ENDPOINT, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.message || 'Server returned an error.');
        }

        const result = await response.json();
        console.log('Upload successful:', result);
        return result;

    } catch (error) {
        console.error('Upload failed:', error);
        throw error; // Re-throw the error to be caught by the caller
    }
}