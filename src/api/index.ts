import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { client, graphql } from "ponder";
import analytics from "./analytics";

const app = new Hono();

// Analytics API routes
app.route("/analytics", analytics);

// Existing ponder routes
app.use("/sql/*", client({ db, schema }));
app.use("/", graphql({ db, schema }));
app.use("/graphql", graphql({ db, schema }));

export default app;
