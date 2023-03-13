const express = require('express');
const { google } = require('googleapis');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const port = process.env.PORT || 8080;

app.use(cors());

app.post('/get-sheet-by-sheet-name', async (req, res) => {
  const { spreadsheetId, sheetName } = req.body;

  const auth = new google.auth.GoogleAuth({
    keyFile: 'creds.json',
    scopes: 'https://www.googleapis.com/auth/spreadsheets',
  });
  const client = await auth.getClient();
  const googleSheets = google.sheets({ version: 'v4', auth: client });

  let response;

  try {
    response = await googleSheets.spreadsheets.values.get({
      auth,
      spreadsheetId,
      range: sheetName,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const { data, status, statusText } = response;

    res.send({ data, status, statusText });
  } catch ({ code, errors }) {
    res.status(code).send(errors);
  }
});

app.post('/update', async (req, res) => {
  const {
    spreadsheetId, range, valueInputOption, resource,
  } = req.body;

  const auth = new google.auth.GoogleAuth({
    keyFile: 'creds.json',
    scopes: 'https://www.googleapis.com/auth/spreadsheets',
  });
  const client = await auth.getClient();
  const googleSheets = google.sheets({ version: 'v4', auth: client });

  let response;

  try {
    response = await googleSheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption,
      resource,
    });

    const { data, status, statusText } = response;

    res.send({ data, status, statusText });
  } catch ({ code, errors }) {
    res.status(code).send(errors);
  }
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Example app listening on port ${port}`);
});
