export interface PrevisionMeteo {
  date: string;
  tempMin: number;
  tempMax: number;
  description: string;
  pluie: number;
  humidite: number;
}

export async function getMeteo(ville = "Montpellier,fr"): Promise<PrevisionMeteo[]> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) throw new Error("OPENWEATHER_API_KEY manquante");

  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${ville}&appid=${apiKey}&units=metric&lang=fr&cnt=24`;
  const res = await fetch(url, { next: { revalidate: 3 * 60 * 60 } });
  if (!res.ok) throw new Error(`OpenWeatherMap error: ${res.status}`);

  const data = await res.json();

  const parJour = new Map<string, typeof data.list>();
  for (const item of data.list as Array<{ dt_txt: string; main: { temp_min: number; temp_max: number; humidity: number }; weather: Array<{ description: string }>; rain?: { "3h": number } }>) {
    const jour = item.dt_txt.split(" ")[0];
    if (!parJour.has(jour)) parJour.set(jour, []);
    parJour.get(jour)!.push(item);
  }

  return Array.from(parJour.entries())
    .slice(0, 3)
    .map(([date, items]) => ({
      date,
      tempMin: Math.min(...items.map((i: { main: { temp_min: number } }) => i.main.temp_min)),
      tempMax: Math.max(...items.map((i: { main: { temp_max: number } }) => i.main.temp_max)),
      description: items[0].weather[0].description,
      pluie: items.reduce((s: number, i: { rain?: { "3h": number } }) => s + (i.rain?.["3h"] ?? 0), 0),
      humidite: Math.round(items.reduce((s: number, i: { main: { humidity: number } }) => s + i.main.humidity, 0) / items.length),
    }));
}
