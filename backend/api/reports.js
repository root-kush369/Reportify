const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (req, res) => {
  if (req.method === "GET") {
    // Get all reports
    const { data, error } = await supabase.from("reports").select("*");
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  }

  if (req.method === "POST") {
    // Add new report
    const { date, category, amount, user, region } = req.body;
    if (!date || !category || !amount || !user || !region)
      return res.status(400).json({ error: "All fields are required" });

    const { data, error } = await supabase
      .from("reports")
      .insert({ date, category, amount: parseFloat(amount), user, region })
      .select();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data ? data[0] : {});
  }

  // Method not allowed
  res.status(405).json({ error: "Method not allowed" });
};