/**
 * Simple image service which provides methods for uploading and deleting the images
 */
export default {

    /**
     * Uploads a file to the server and returns the URL of the uploaded file.
     *
     * @param {File} file - The file to be uploaded.
     * @return {Promise<string>} A promise that resolves to the URL of the uploaded file.
     */
    async upload(file: File): Promise<string> {
        /*
        // Call your server, e.g.:

        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/image/upload', { method: 'POST', body: formData });
        const data = await res.json();
        return data.url; // The uploaded image URL
         */

        // for testing return any sample image url
        return 'https://picsum.photos/200/300'
    },

    /**
     * Deletes an image from the server using the provided image URL.
     *
     * @param {string} imageUrl - The URL of the image to be deleted.
     * @return {Promise<void>} A promise that resolves when the delete operation is complete.
     */
    async delete(imageUrl: string): Promise<void> {
        /*
        // Call your server, e.g.:

        await fetch('/api/image/delete', {
            method: 'DELETE',
            body: JSON.stringify({ url: imageUrl }),
            headers: { 'Content-Type': 'application/json' }
        });

         */
    }
};