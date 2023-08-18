const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 8080;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
express.static('public');

const dataDir = path.join(__dirname, 'data');

app.post('/submit', (req, res) => {
  const { itemTitle, itemDescription } = req.body;

  const itemData = {
    title: itemTitle,
    description: itemDescription,
  };

  const itemFileName = `${Date.now()}.json`;

  fs.writeFileSync(path.join(dataDir, itemFileName), JSON.stringify(itemData));

  console.log('New Item:', itemTitle, '-', itemDescription);
  res.redirect('/');
});

app.get('/get-items', (req, res) => {
  const itemFiles = fs.readdirSync(dataDir);
  const items = itemFiles.map(fileName => {
    const filePath = path.join(dataDir, fileName);
    const itemData = JSON.parse(fs.readFileSync(filePath));
    return itemData;
  });

  res.json(items);
});

app.get('/', (req, res) => {
  const itemFiles = fs.readdirSync(dataDir);
  const items = itemFiles.map(fileName => {
    const filePath = path.join(dataDir, fileName);
    const itemData = JSON.parse(fs.readFileSync(filePath));
    return itemData;
  });

  res.render('index', { items });
});

app.post('/clear-files', async (req, res) => {
  fs.readdir(dataDir, (err, files) => {
    if (err) throw err;
      for (const file of files) {
        fs.unlink(path.join(dataDir, file), (err) => {
          if (err) throw err;
        });
        console.log('Deleted:', file);
      }
    });
    res.redirect('/');
});

app.get('/health-check',(req,res)=> {
  res.send ("Health check passed");
});

app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});
