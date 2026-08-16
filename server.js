require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));


// ======================================================
// GEMINI CLIENT
// ======================================================

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  return new GoogleGenAI({
    apiKey: apiKey.trim()
  });
}


// ======================================================
// API STATUS
// ======================================================

app.get("/api/status", (req, res) => {

  const key = process.env.GEMINI_API_KEY;

  res.json({
    success: true,
    server: "online",
    provider: "Gemini",
    forgeAI: Boolean(key),
    apiKeyConfigured: Boolean(key),
    apiKeyLength: key ? key.trim().length : 0
  });

});


// ======================================================
// GEMINI KEY DIAGNOSTIC
// ======================================================

app.get("/api/ai-status", (req, res) => {

  const key = process.env.GEMINI_API_KEY;

  res.json({
    success: true,
    provider: "Gemini",
    apiKeyConfigured: Boolean(key),
    apiKeyLength: key ? key.trim().length : 0
  });

});


// ======================================================
// FORGE AI
// ======================================================

app.post("/api/forge-ai", async (req, res) => {

  try {

    const {
      message = "",
      action = "chat",
      code = "",
      language = "text",
      project = "ForgeCode"
    } = req.body || {};


    // --------------------------------------------------
    // Validate message
    // --------------------------------------------------

    if (
      typeof message !== "string" ||
      !message.trim()
    ) {

      return res.status(400).json({
        success: false,
        error: "Message is required."
      });

    }


    // --------------------------------------------------
    // Validate API key
    // --------------------------------------------------

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || !apiKey.trim()) {

      console.error(
        "ForgeAI: GEMINI_API_KEY is missing."
      );

      return res.status(500).json({
        success: false,
        error:
          "ForgeAI is not configured on the server. GEMINI_API_KEY is missing."
      });

    }


    // --------------------------------------------------
    // Create Gemini client
    // --------------------------------------------------

    const ai = getGeminiClient();


    // --------------------------------------------------
    // ForgeAI system prompt
    // --------------------------------------------------

    const prompt = `
You are ForgeAI, the professional AI coding assistant inside ForgeCode.

You help users build, debug, understand, improve and refactor software.

PROJECT:
${project}

CURRENT FILE LANGUAGE:
${language}

CURRENT ACTION:
${action}

CURRENT CODE:
${code || "(No code was provided.)"}

USER REQUEST:
${message}

INSTRUCTIONS:

1. Give a useful and accurate answer.
2. Focus on the user's current project and code.
3. If the user asks for debugging, identify the likely problem and provide the fix.
4. If the user asks for code, provide usable code.
5. If changing code would help, clearly explain what should be changed.
6. Preserve existing functionality unless the user asks to change it.
7. Consider responsive design when working on frontend code.
8. Do not claim that you changed files when you only provided code.
9. Do not invent APIs, files or project features.
10. Be concise but useful.
11. Format code using Markdown code blocks.
`;


    // --------------------------------------------------
    // Gemini Interactions API
    // --------------------------------------------------

    const interaction = await ai.interactions.create({

      model: "gemini-3.6-flash",

      input: prompt

    });


    // --------------------------------------------------
    // Extract response
    // --------------------------------------------------

    const reply =
      interaction.output_text ||
      "";


    if (!reply.trim()) {

      console.error(
        "Gemini returned no text:",
        JSON.stringify(interaction)
      );

      return res.status(502).json({
        success: false,
        error: "Gemini returned an empty response."
      });

    }


    // --------------------------------------------------
    // Success
    // --------------------------------------------------

    return res.json({

      success: true,

      reply: reply

    });


  } catch (error) {

    console.error(
      "===================================="
    );

    console.error(
      "FORGE AI ERROR"
    );

    console.error(
      error
    );

    console.error(
      "====================================");


    const message =
      error?.message ||
      String(error);


    // --------------------------------------------------
    // Authentication error
    // --------------------------------------------------

    if (
      message.includes("401") ||
      message.toLowerCase().includes("unauthorized") ||
      message.toLowerCase().includes("api key") ||
      message.toLowerCase().includes("authentication")
    ) {

      return res.status(401).json({

        success: false,

        error:
          "Gemini rejected the API key. Check GEMINI_API_KEY in Render and make sure it is a valid Gemini API key."

      });

    }


    // --------------------------------------------------
    // Rate limit / quota
    // --------------------------------------------------

    if (
      message.includes("429") ||
      message.toLowerCase().includes("quota") ||
      message.toLowerCase().includes("rate limit")
    ) {

      return res.status(429).json({

        success: false,

        error:
          "Gemini API quota or rate limit reached. Please try again later or check your Gemini API usage."

      });

    }


    // --------------------------------------------------
    // Generic error
    // --------------------------------------------------

    return res.status(500).json({

      success: false,

      error: message

    });

  }

});


// ======================================================
// API TEST
// ======================================================

app.get("/api/test", (req, res) => {

  res.json({

    success: true,

    message: "EXPRESS API IS WORKING"

  });

});


// ======================================================
// FRONTEND
// ======================================================

app.use(
  express.static(__dirname)
);


// ======================================================
// SPA FALLBACK
// ======================================================

// Express 5 does not accept app.get("*").
// This intentionally uses a middleware fallback instead.

app.use((req, res, next) => {

  if (
    req.method === "GET" &&
    !req.path.startsWith("/api/")
  ) {

    return res.sendFile(
      path.join(__dirname, "index.html")
    );

  }

  next();

});


// ======================================================
// ERROR HANDLER
// ======================================================

app.use((err, req, res, next) => {

  console.error(
    "SERVER ERROR:",
    err
  );

  res.status(500).json({

    success: false,

    error:
      err.message ||
      "Internal server error."

  });

});


// ======================================================
// START SERVER
// ======================================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `ForgeCode running on port ${PORT}`
    );

  }
);
