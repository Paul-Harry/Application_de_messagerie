const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

// connect DB
require('./db/connection');

// Import file
const Users = require('./models/Users');
const Conversations = require('./models/Conversations');
const Messages = require('./models/Messages');

// App use 
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

const port = process.env.PORT || 8000;


//Routes
app.get('/', (req, res) => {
  res.send('welcome');
});

app.post('/api/register', async (req, res, next) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).send('please all fields are required');

    } else {
      const isAllreadyExist = await Users.findOne({ email });

      if (isAllreadyExist) {
        res.status(400).send('User already exist');
      } else {
        const newUser = new Users({ fullName, email, password });
        bcryptjs.hash(password, 10, (err, hashedPassword) => {
          newUser.set('password', hashedPassword);
          newUser.save();
          next();
        })
        return res.status(200).send('User created successfully');
      }
    }


  } catch (error) {
    console.log(error, 'error')
  }
})

app.post('/api/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send('please all fields are required');

    } else {
      const user = await Users.findOne({ email });

      if (!user) {
        res.status(400).send('User email or password is incorrect');
      } else {
        const validateUser = await bcryptjs.compare(password, user.password);
        if (!validateUser) {
          res.status(400).send('User email or password is incorrect');
        } else {
          const payload = {
            userId: user._id,
            email: user.email
          }
          const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'THIS_IS_MY_SECRET_KEY';

          jwt.sign(payload, JWT_SECRET_KEY, { expiresIn: 84600 }, async (err, token) => {
            await Users.updateOne({ _id: user._id }, {
              $set: { token }
            })
            user.save();
            return res.status(200).json({ user: { email: user.email, fullName: user.fullName }, token: token })
          })
        }
      }
    }
  } catch (error) {
    console.log(error, 'error')
  }
});

app.post('/api/conversations', async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;
    const newConversation = new Conversations({ members: [senderId, receiverId] });
    await newConversation.save();
    res.status(200).send('Conversation created successfully');
  } catch (error) {
    console.log(error, 'error')
  }
});

app.get('/api/conversations/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const conversations = await Conversations.find({ members: { $in: [userId] } });
    const conversationUserData = Promise.all(conversations.map(async (conversation) => {
      const receiverId = conversation.members.find((member) => member !== userId);
      const user = await Users.findById(receiverId);
      return { user: { email: user.email, fullName: user.fullName }, conversationId: conversation._id }
    }));
    res.status(200).json(await conversationUserData);
  } catch (error) {
    console.log(error, 'Error')
  }
});

app.post('/api/message', async (req, res) => {
  try {
    const { conversationId, senderId, message, receiverId = '' } = req.body;

    if(!senderId || !message) return res.status(400).send('Please fill all required fields')
    if(!conversationId && receiverId){
      const newConversation = new Conversations({ members: [senderId, receiverId]});
      await newConversation.save();
      const newMessage = new Messages ({conversationId: newConversation._id, senderId, message});
      await newMessage.save();
      return res.status(200).send('Message sent successfuly');
    } else if(!conversationId && !receiverId){
      return res.status(400).send('please fill all required fields')
    }

    const newMessage = new Messages({ conversationId, senderId, message });
    await newMessage.save();
    res.status(200).send('Message sent successfully');
  } catch (error) {
    console.log(error, 'Error')
  }
});

app.get('/api/message/:conversationId', async (req, res) => {
  try {
    const conversationId = req.params.conversationId;

    if(!conversationId) return res.status(200).json([]);

    const messages = await Messages.find({ conversationId });
     const messageUserData = Promise.all(messages.map(async (message)=> {
        const user = await Users.findById(message.senderId);
       return { user: {email: user.email, fullName: user.fullName}, message: message.message}
    }));

    res.status(200).json(await messageUserData);
  } catch (error) {
    console.log('Error', error)
  }
});

app.get('/api/users', async (req, res)=> {
  try {
      const users = await Users.find();
      const UsersData = Promise.all(users.map(async (user)=> {
        return { user: {email: user.email, fullName: user.fullName}, userId: user._id}
      }));

      res.status(200).json(await UsersData);
  }catch(error){
    console.log('Error', error)
  }
})

app.listen(port, () => {
  console.log('listening on port' + port);
});