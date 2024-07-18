const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const app = express();

// Configure multer to save files with the original filename
const storage = multer.diskStorage({
    destination: './uploads',
    filename: function (req, file, cb) {
        const fileBaseName = file.originalname;
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, fileBaseName); // Directly use the original name
    }
});

const upload = multer({ storage: storage });
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));  // Serve static files
app.use('/uploads', express.static('uploads'));  // Make s/ Serve uploaded images
app.use(express.json());

// Serve index.html at the root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});
app.get('/chat-menuadmin', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});
// API endpoint to get all categories and their items
app.get('/categories', (req, res) => {
    fs.readFile('./data.json', 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading data.');
            return;
        }
        res.json(JSON.parse(data));
    });
});

// Endpoint to add a new category
app.post('/add-category', upload.none(), (req, res) => {
    const newCategory = { name: req.body.name, items: [] };
    fs.readFile('./data.json', 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading data.');
            return;
        }
        const json = JSON.parse(data);
        json.categories.push(newCategory);
        fs.writeFile('./data.json', JSON.stringify(json), 'utf8', (err) => {
            if (err) {
                res.status(500).send('Error writing data.');
                return;
            }
            res.redirect('/chat-menuadmin')
        });
    });
});

// Endpoint to add a new item to a category with an image
app.post('/add-item', upload.single('itemImage'), (req, res) => {
    const { category, itemName, itemDescription, itemPrice } = req.body;
    const itemImage = req.file ? `/uploads/${req.file.filename}` : '';

    fs.readFile('./data.json', 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading data.');
            return;
        }
        let json = JSON.parse(data);
        const cat = json.categories.find(c => c.name === category);
        if (cat) {
            const newItem = {
                id: Date.now(),
                name: itemName,
                description: itemDescription,
                price: parseFloat(itemPrice),
                image: itemImage
            };
            cat.items.push(newItem);
            fs.writeFile('./data.json', JSON.stringify(json), 'utf8', (err) => {
                if (err) {
                    res.status(500).send('Error writing data.');
                    return;
                }
                res.redirect('/chat-menuadmin');
            });
        } else {
            res.status(404).send('Category not found.');
        }
    });
});

app.delete('/delete-item/:categoryId/:itemId', (req, res) => {
    const { categoryId, itemId } = req.params;

    fs.readFile('./data.json', 'utf8', (err, data) => {
        if (err) {
            res.status(500).send({error: 'Failed to read data.'});
            return;
        }

        let jsonData = JSON.parse(data);
        const category = jsonData.categories.find(c => c.name === categoryId);
        if (!category) {
            res.status(404).send({error: 'Category not found.'});
            return;
        }

        const itemIndex = category.items.findIndex(item => item.id.toString() === itemId);
        if (itemIndex === -1) {
            res.status(404).send({error: 'Item not found.'});
            return;
        }

        category.items.splice(itemIndex, 1);

        fs.writeFile('./data.json', JSON.stringify(jsonData), 'utf8', (err) => {
            if (err) {
                res.status(500).send({error: 'Failed to update data.'});
                return;
            }
            res.redirect('/chat-menuadmin')
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
