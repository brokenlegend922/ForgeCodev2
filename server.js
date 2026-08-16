require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


// ==============================
// API STATUS
// ==============================

app.get("/api/status", (req, res) => {
  res.json({
    success: true,
    server: "online",
    forgeAI: Boolean(process.env.GEMINI_API_KEY),
    provider: "Gemini"
  });
});


// ==============================
// FORGE AI
// ==============================

app.post("/api/forge-ai", async (req, res) => {

  try {

    const {
      message = "",
      action = "chat",
      code = "",
      language = "text",
      project = "ForgeCode"
    } = req.body;


    if (!message.trim()) {

      return res.status(400).json({
        success: false,
        error: "Message is required."
      });

    }


    if (!process.env.GEMINI_API_KEY) {

      return res.status(500).json({
        success: false,
        error: "GEMINI_API_KEY is missing."
      });

    }


    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });


    const prompt = `
You are ForgeAI inside ForgeCode.

You are a professional coding assistant.

Project:
${project}

Current file:
${language}

Action:
${action}

Current code:
${code}

User request:
${message}

Help the user professionally.

If they ask for code,
provide usable code.

If they ask to debug,
identify the problem and give the fix.

If they ask to explain,
explain clearly.

Do not make up information.
`;


    const interaction =
      await ai.interactions.create({

        model: "gemini-3.6-flash",

        input: prompt

      });


    const reply =
      interaction.output_text ||
      "ForgeAI returned an empty response.";


    return res.json({

      success: true,

      reply: reply

    });


  } catch (error) {

    console.error(
      "FORGE AI ERROR:",
      error
    );


    return res.status(500).json({

      success: false,

      error:
        error.message ||
        "Gemini request failed."

    });

  }

});


// ==============================
// FRONTEND
// ==============================

app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "EXPRESS API IS WORKING"
  });
}); 

app.use(express.static(__dirname));

// ==============================
// START
// ==============================

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `ForgeCode running on port ${PORT}`
    );

  }
);