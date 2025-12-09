import express from 'express';
import dotenv from 'dotenv';
import { startSendCosumer } from './consumer.js';

dotenv.config();

const app = express();

startSendCosumer();

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
})