import amqp from 'amqplib';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export const startSendCosumer = async()=> {
    try {
        const connection = await amqp.connect({
            protocol: 'amqp',
            hostname: process.env.RabbitMQ_HOSTNAME,
            port: 5672,
            username: process.env.RabbitMQ_USERNAME,
            password: process.env.RabbitMQ_PASSWORD,
            })
     
        const channel = await connection.createChannel();
        const queueName = "send-otp";
        await channel.assertQueue(queueName, {
            durable: true
        });

        console.log("Consumer mail service started, listening for OTP emails");


        channel.consume(queueName, async (message) => {
            if(message) {
                try {
                    const {to, subject, body} = JSON.parse(message.content.toString());
                    const transporter = nodemailer.createTransport({
                        host: 'smtp.gmail.com',
                        port: 465,
                        auth: {
                            user: process.env.MAIL_USER,
                            pass: process.env.MAIL_PASSWORD
                        }
                    });

                    await transporter.sendMail({
                        from:"Chat App",
                        to, 
                        subject,
                        text: body
                    })
                    
                    console.log(`OTP send to ${to}`);
                    channel.ack(message);
                } catch (error) {
                    console.log("Failed to send OTP", error);
                }
            }
        })

    } catch (error) {
        console.log("Failed to start RabbitMQ consumer", error);
    }
}