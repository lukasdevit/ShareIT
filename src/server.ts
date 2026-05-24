import Fastify from "fastify";
import multipart from "@fastify/multipart";
import staticPlugin from "@fastify/static";
import path from "path";
import fs from "fs";
import { pipeline } from "stream/promises";
import { nanoid } from "nanoid";
import { db } from "./db/database.js";
import { PORT, BASE_URL, UPLOAD_DIR } from "./config/index.js";

const app = Fastify({ logger: true });

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

app.register(multipart, {
    limits: {
        fileSize: 1 * 1024 * 1024 * 1024,
    },
});

app.register(staticPlugin, {
    root: UPLOAD_DIR,
    prefix: "/file/",
});

app.post("/upload", async (request, reply) => {
    const file = await request.file();

    if (!file) {
        return reply.code(400).send({ error: "No file was uploaded" });
    }

    const id = nanoid(10);
    const ext = path.extname(file.filename);
    const filename = `${id}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    await pipeline(file.file, fs.createWriteStream(filepath));

    const stats = fs.statSync(filepath);

    await new Promise<void>((resolve, reject) => {
        db.run(
            `
            INSERT INTO files (
                filename,
                path,
                size,
                mime_type,
                created_at
            )
            VALUES (?, ?, ?, ?, ?)
            `,
            [
                filename,
                filepath,
                stats.size,
                file.mimetype,
                new Date().toISOString(),
            ],
            (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve();
            }
        );
    });

    return reply.send({
        url: `${BASE_URL}/file/${filename}`,
    });
});

app.get("/files", async (_request, reply) => {
    db.all(
        `
        SELECT * FROM files
        ORDER BY created_at DESC
        `,
        [],
        (err, rows) => {
            if (err) {
                reply.code(500).send({ error: err.message });
                return;
            }

            reply.send(rows);
        }
    );
});

await app.listen({ port: PORT });
console.log(`Server listening on port ${PORT}`);