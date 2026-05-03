const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ================= SALESFORCE CREDENTIALS =================
const CLIENT_ID =
  "3MVG97L7PWbPq6UyVT8jaE9TYCvJvOaOLH9ppwPSt2xvTJ3LE4BGZKfkiAk_OpktGsCylGHYKZlRoZ4a49yG7";

const CLIENT_SECRET =
  "51A76BF25F905E4328D6EA768F2B5028ACC90C247D78676030C49242E555F015";

const PORT = 5000;
const REDIRECT_URI = "http://localhost:5000/callback";

let ACCESS_TOKEN = "";
let INSTANCE_URL = "";

// ================= LOGIN =================
app.get("/login", (req, res) => {
  const url =
    "https://login.salesforce.com/services/oauth2/authorize" +
    "?response_type=code" +
    "&client_id=" + CLIENT_ID +
    "&redirect_uri=" + encodeURIComponent(REDIRECT_URI);

  res.redirect(url);
});

// ================= CALLBACK =================
app.get("/callback", async (req, res) => {
  const code = req.query.code;

  try {
    const tokenRes = await axios.post(
      "https://login.salesforce.com/services/oauth2/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code: code,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    ACCESS_TOKEN = tokenRes.data.access_token;
    INSTANCE_URL = tokenRes.data.instance_url;

    res.redirect("/dashboard");
  } catch (err) {
    res.send("OAuth Error: " + JSON.stringify(err.response?.data));
  }
});

// ================= DASHBOARD =================
app.get("/dashboard", (req, res) => {
  res.send(`
    <h2>Salesforce Validation Rules Dashboard</h2>

    <button onclick="getRules()">Get Validation Rules</button>

    <table border="1" cellpadding="10" id="table"></table>

    <script>
      async function getRules() {
        const res = await fetch("/rules");
        const data = await res.json();

        let html = "<tr><th>Name</th><th>Status</th></tr>";

        data.forEach(r => {
          html += "<tr>" +
                  "<td>" + r.ValidationName + "</td>" +
                  "<td>" + (r.Active ? "Active" : "Inactive") + "</td>" +
                  "</tr>";
        });

        document.getElementById("table").innerHTML = html;
      }
    </script>
  `);
});

// ================= RULES =================
app.get("/rules", async (req, res) => {
  try {
    const query =
      "SELECT Id, ValidationName, Active " +
      "FROM ValidationRule " +
      "WHERE EntityDefinition.QualifiedApiName = 'Account'";

    const response = await axios.get(
      INSTANCE_URL +
        "/services/data/v59.0/tooling/query/?q=" +
        encodeURIComponent(query),
      {
        headers: {
          Authorization: "Bearer " + ACCESS_TOKEN,
        },
      }
    );

    res.json(response.data.records || []);
  } catch (err) {
    res.status(500).send(err.response?.data || err.message);
  }
});

// ================= START =================
app.listen(PORT, () => {
  console.log(`Server running → http://localhost:${PORT}/login`);
});