
const axios = require('axios');

// Language IDs (Judge0 compatible)
const getLanguageById = (lang) => {

    const language = {
        "c++": 54,
        "java": 62,
        "javascript": 63
    };

    return language[lang.toLowerCase()];
};


// Common API configuration
const API_URL = 'https://api.onlinecompiler.io/api/judge0';

const headers = {
    'X-Auth-Token': process.env.ONLINECOMPILER_API_KEY,
    'Content-Type': 'application/json'
};


// Submit multiple test cases
const submitBatch = async (submissions) => {

    const options = {
        method: 'POST',
        url: `${API_URL}/submissions/batch`,
        params: {
            base64_encoded: 'false'
        },
        headers,
        data: {
            submissions
        }
    };

    try {

        const response = await axios.request(options);

        return response.data;

    } catch (error) {

        console.error(
            "OnlineCompiler Batch Error:",
            error.response?.data || error.message
        );

        throw error;
    }
};


// Wait function
const waiting = (timer) => {
    return new Promise((resolve) => {
        setTimeout(resolve, timer);
    });
};


// Fetch submission results using tokens
const submitToken = async (resultToken) => {

    const options = {
        method: 'GET',
        url: `${API_URL}/submissions/batch`,
        params: {
            tokens: resultToken.join(","),
            base64_encoded: 'false',
            fields: '*'
        },
        headers
    };

    async function fetchData() {

        try {

            const response = await axios.request(options);

            return response.data;

        } catch (error) {

            console.error(
                "OnlineCompiler Token Error:",
                error.response?.data || error.message
            );

            throw error;
        }
    }


    while (true) {

        const result = await fetchData();

        const IsResultObtained =
            result.submissions.every((r) => r.status_id > 2);

        if (IsResultObtained) {
            return result.submissions;
        }

        await waiting(1000);
    }

};


module.exports = {
    getLanguageById,
    submitBatch,
    submitToken
};
