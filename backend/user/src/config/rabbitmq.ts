import amqp from 'amqplib';

let channel: amqp.Channel;

export const connectRabbitMQ = async () => {
    try {
        const connection = await amqp.connect({
            protocol: 'amqp',
            hostname: process.env.RabbitMQ_HOSTNAME,
            port: 5672,
            username: process.env.RabbitMQ_USERNAME,
            password: process.env.RabbitMQ_PASSWORD,
        })

        channel = await connection.createChannel();
        console.log("RabbitMQ Connected");

    } catch (error) {
        console.log("Failed to connect to RabbitMQ", error);
    }
}


export const publishToQueue = async (queueName: string, message: any): Promise<boolean> => {
    try {
        if(!channel) {
            console.error("RabbitMQ Channel is not defined");
            return false;
        }

        await channel.assertQueue(queueName, {
            durable: true
        });

        const sent = channel.sendToQueue(
            queueName,
            Buffer.from(JSON.stringify(message)),
            { persistent: true }
        );

        if (!sent) {
            console.error("Failed to send message to queue");
            return false;
        }

        return true;
    } catch (error) {
        console.error("Error publishing to queue:", error);
        return false;
    }
} 