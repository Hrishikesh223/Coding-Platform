
const Problem = require("../models/problem");
const Submission = require("../models/submission");
const User = require("../models/user");

const {
    getLanguageById,
    submitBatch,
    submitToken
} = require("../utils/problemUtility");


// ================= SUBMIT CODE =================


const submitCode = async (req, res) => {
    try {
        const userId = req.result._id;
        const problemId = req.params.id;

        let { code, language } = req.body;

        if (!userId || !code || !problemId || !language) {
            return res.status(400).send("Some field missing");
        }

        // Fetch problem
        const problem = await Problem.findById(problemId);

        if (!problem) {
            return res.status(404).send("Problem not found");
        }

        // Normalize language
        const normalizeLanguage = (lang) => {
            lang = lang.toLowerCase();

            if (lang === "cpp") {
                return "c++";
            }

            return lang;
        };

        language = normalizeLanguage(language);

        // Find reference solution
        const reference = problem.referenceSolution.find(
            (solution) =>
                normalizeLanguage(solution.language) === language
        );

        if (!reference) {
            return res.status(400).send("Reference solution not found");
        }

        // Extract driver code
        const marker = "// DRIVER";
        const driverIndex = reference.completeCode.indexOf(marker);

        if (driverIndex === -1) {
            return res.status(400).send("Driver code not found");
        }

        const driverCode = reference.completeCode.substring(
            driverIndex + marker.length
        );

        // Combine user code with driver
        const finalCode = code + "\n\n" + driverCode;

        // Get language ID
        const languageId = getLanguageById(language);

        if (!languageId) {
            return res.status(400).send("Unsupported language");
        }

        // Create submission record
        const submittedResult = await Submission.create({
            userId,
            problemId,
            code,
            language,
            status: "pending",
            testCasesTotal: problem.hiddenTestCases.length
        });

        // Prepare hidden test cases
        const submissions = problem.hiddenTestCases.map((testcase) => ({
            source_code: finalCode,
            language_id: languageId,
            stdin: testcase.input,
            expected_output: testcase.output
        }));

        // Submit batch
        const submitResult = await submitBatch(submissions);

        const resultToken = submitResult.map(
            (value) => value.token
        );

        // Get execution results
        const testResult = await submitToken(resultToken);

        let testCasesPassed = 0;
        let runtime = 0;
        let memory = 0;
        let status = "accepted";
        let errorMessage = null;

        for (const test of testResult) {
            if (test.status_id == 3) {
                testCasesPassed++;
                runtime += parseFloat(test.time || 0);
                memory = Math.max(memory, test.memory || 0);
            } else {
                if (test.status_id == 4) {
                    status = "error";
                } else {
                    status = "wrong";
                }

                errorMessage =
                    test.stderr ||
                    test.compile_output ||
                    test.message ||
                    test.status?.description;
            }
        }

        // Update submission record
        submittedResult.status = status;
        submittedResult.testCasesPassed = testCasesPassed;
        submittedResult.errorMessage = errorMessage;
        submittedResult.runtime = runtime;
        submittedResult.memory = memory;

        await submittedResult.save();

        // Mark problem as solved only if accepted
        if (
            status === "accepted" &&
            !req.result.problemSolved.includes(problemId)
        ) {
            req.result.problemSolved.push(problemId);
            await req.result.save();
        }

        // Send response
        res.status(201).json({
            accepted: status === "accepted",
            totalTestCases: submittedResult.testCasesTotal,
            passedTestCases: testCasesPassed,
            runtime,
            memory,
            errorMessage
        });

    } catch (err) {
        res.status(500).send("Internal Server Error " + err);
    }
};



// ================= RUN CODE =================

const runCode = async (req, res) => {
    try {
        const userId = req.result._id;
        const problemId = req.params.id;

        let { code, language } = req.body;

        if (!userId || !code || !problemId || !language) {
            return res.status(400).send("Some field missing");
        }

        // Fetch problem
        const problem = await Problem.findById(problemId);

        if (!problem) {
            return res.status(404).send("Problem not found");
        }

        // Normalize language
        const normalizeLanguage = (lang) => {
            lang = lang.toLowerCase();

            if (lang === 'cpp') {
                return 'c++';
            }

            return lang;
        };

        language = normalizeLanguage(language);

        // Find reference solution
        const reference = problem.referenceSolution.find(
            (solution) =>
                normalizeLanguage(solution.language) === language
        );

        if (!reference) {
            return res.status(400).send("Reference solution not found");
        }

        // Find DRIVER marker
        const marker = "// DRIVER";

        const driverIndex = reference.completeCode.indexOf(marker);

        if (driverIndex === -1) {
            return res.status(400).send("Driver code not found");
        }

        // Extract driver code
        const driverCode = reference.completeCode.substring(
            driverIndex + marker.length
        );

        // Combine user's code with driver
        const finalCode = code + "\n\n" + driverCode;

        // Get language ID
        const languageId = getLanguageById(language);

        if (!languageId) {
            return res.status(400).send("Unsupported language");
        }

        // Prepare visible test cases
        const submissions = problem.visibleTestCases.map((testcase) => ({
            source_code: finalCode,
            language_id: languageId,
            stdin: testcase.input,
            expected_output: testcase.output
        }));

        // Submit batch
        const submitResult = await submitBatch(submissions);

        const resultToken = submitResult.map((value) => value.token);

        // Get execution results
        const testResult = await submitToken(resultToken);

        let testCasesPassed = 0;
        let runtime = 0;
        let memory = 0;
        let status = true;
        let errorMessage = null;

        for (const test of testResult) {
            if (test.status_id == 3) {
                testCasesPassed++;
                runtime += parseFloat(test.time);
                memory = Math.max(memory, test.memory);
            } else {
                status = false;
                errorMessage = test.stderr || test.compile_output ||
                    test.message || test.status?.description;
            }
        }

        res.status(201).json({
            success: status,
            testCasesPassed,
            totalTestCases: testResult.length,
            testCases: testResult,
            runtime,
            memory,
            errorMessage
        });

    } catch (err) {
        res.status(500).send("Internal Server Error " + err);
    }
};


// ================= EXPORT =================

module.exports = { submitCode, runCode };
