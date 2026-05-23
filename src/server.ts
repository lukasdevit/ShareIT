import Fastify from "fastify";
import multipart from "@fastify/multipart";
import staticPlugin from "@fastify/static";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { pipeline } from "stream/promises";
import { nanoid } from "nanoid";

dotenv.config();

const app = Fastify({ logger: true});

const UPLOAD_DIR = path.join(process.cwd(), process.env.UPLOAD_DIR ||  "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
}

app.register(multipart, {
    limits: {
        fileSize: 1 * 1024 * 1024 * 1024, //1GB
    }
});

app.register(staticPlugin, {
    root: UPLOAD_DIR,
    prefix: "/file/"
})

app.post("/upload", async (request, reply) => {
    const file = await request.file();

    if (!file) {
        return reply.code(400).send({ error: "No file"});
    }

    const id = nanoid(10);
    const ext = path.extname(file.filename);
    const filename = `${id}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    await pipeline(file.file, fs.createWriteStream(filepath));

    return {
        url: `${process.env.BASE_URL}/file/${filename}`,
    }


})

app.listen({
    port: Number(process.env.PORT || 3000),
})