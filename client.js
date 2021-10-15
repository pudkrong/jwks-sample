const { JWT } = require('jose');
const jwksClient = require('jwks-rsa');
const secs = require('./lib/secs');

const token = `eyJhbGciOiJSUzI1NiIsImtpZCI6Ik84Y2FvRkhjWm1kNHhNbTEtQk1lNERXaUswb21UUUNKQ0I5Nk93VHU0M1kifQ.eyJuYW1lIjoicHVkIiwic3ViIjoidXNlciBpZCIsImlzcyI6Imh0dHBzOi8vYW1pdHkuY28iLCJpYXQiOjE2MzQyODQ0NTYsImV4cCI6MTYzNDM3MDg1Nn0.X9Tx5ZKl2ar1QlP4ee8V3q7KUD--yJSoNwVNNPcQ7tkHbuojn03ojQv9QeFDyzB-Q4qG8cIYZBZvkvCmKNZF1zC9VC05f5TU0cAlUzgHt6Lqzbsja6p_ouBaZXOT9nEPPa3YyMF0aemsKq1vf-xAXa4Xq8biRIPnj2LPnIFuDEU3xxU86-4SZH7CYU5vkx59JL0QGehXz05tY4UQ4szQomFBRsmHBw85kMu161X-TaQ970857WouROUCL-TazrKk1U3l5qUhPTK6mcXmNSr3-KoZwDfUT3HPGVKLPdwM030GruHH_HErbL2wmiIztWQwEAV68nLZD4csZXzzUyLoYw`;

async function main () {
  const client = jwksClient({
    rateLimit: true,
    jwksRequestsPerMinute: 10,

    cache: true,
    cacheMaxEntries: 10,
    cacheMaxAge: secs('10 mins') * 1000,
    jwksUri: 'http://localhost:3000/.well-known/jwks.json',

    timeout: 5000,
  });

  const header = JSON.parse(Buffer.from(token.replace(/\.(.+)$/, ''), 'base64').toString());
  const key = await client.getSigningKey(header.kid);

  const decode = JWT.verify(token, key.getPublicKey());
  console.log(decode);
}

main().catch(console.error);