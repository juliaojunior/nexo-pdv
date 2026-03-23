import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    // Call TinyURL API free endpoint to shorten the long GET payload
    const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, {
      method: "GET",
    });

    if (!res.ok) {
        return NextResponse.json({ error: "TinyURL API rejected the request" }, { status: 500 });
    }

    // The endpoint returns plain text with the short URL
    const shortUrl = await res.text();

    return NextResponse.json({ shortUrl });
  } catch(e) {
    console.error("Url Shorten Error:", e);
    return NextResponse.json({ error: "Failed to process shortening" }, { status: 500 });
  }
}
