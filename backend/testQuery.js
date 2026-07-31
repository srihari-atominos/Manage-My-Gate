import mongoose from 'mongoose';
import PollVote from './src/features/poll/pollVote.model.js';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to DB');
    const votes = await PollVote.find().limit(5).lean();
    console.log('Votes:', votes);
    
    if (votes.length > 0) {
        const pollId = votes[0].pollId;
        const orgId = votes[0].orgId;
        console.log(`Testing getPollVoters for pollId: ${pollId}, orgId: ${orgId}`);
        
        const poll = await mongoose.connection.collection('polls').findOne({ _id: new mongoose.Types.ObjectId('6a672b2880df4f603fbc0792') });

        console.log('Poll:', JSON.stringify(poll, null, 2));

    }
    
    process.exit(0);
  });
