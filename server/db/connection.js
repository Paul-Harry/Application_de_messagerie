const mongoose = require('mongoose');

const url = `mongodb+srv://admin:admin1234@cluster0.fg0k3.mongodb.net/?retryWrites=true&w=majority`;

mongoose.connect(url, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
}).then(()=> console.log('Connected to DB')).catch((e)=> console.log('error', e));