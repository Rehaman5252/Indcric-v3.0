//AIzaSyASMTWUAVIc7kDdSuGhbSEqrxUyvtzILhY
const API_KEY = "AIzaSyCeY18Hx3z1wUkw_i6_xl5nLzYCVi2NdBk";

async function testAPI() {
  try {
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

    const body = {
      contents: [
        { role: "user", parts: [{ text: "Say hello!" }] }
      ]
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    console.log(result);

  } catch (err) {
    console.error("Error:", err);
  }
}

testAPI();
