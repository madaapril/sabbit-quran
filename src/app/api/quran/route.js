export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const res = await fetch(`https://api.quran.com/api/v4/verses/by_page/${page}?words=true&word_fields=text_uthmani&translations=33`, {
      headers: {
        "Accept": "application/json",
      },
    });
    if (!res.ok) {
      return Response.json({ error: "Failed to fetch from Quran API" }, { status: res.status });
    }
    const data = await res.json();
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
