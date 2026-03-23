import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    // Usando Spoo.me API via POST que aceita URLs gigantes em Body (Ao invés de estourar limite GET)
    const res = await fetch("https://spoo.me/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: `url=${encodeURIComponent(url)}`
    });

    if (!res.ok) {
        return NextResponse.json({ error: "Shortener API rejected the request" }, { status: 500 });
    }

    const data = await res.json();

    return NextResponse.json({ shortUrl: data.short_url });
  } catch(e) {
    console.error("Url Shorten Error:", e);
    return NextResponse.json({ error: "Failed to process shortening" }, { status: 500 });
  }
}
