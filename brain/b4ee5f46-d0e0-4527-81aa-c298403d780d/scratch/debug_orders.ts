import { createClient } from "@nextblock-cms/db/server";

async function debugOrders() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('orders').select('*').limit(5);
  
  if (error) {
    console.error("Query Error:", error);
  } else {
    console.log("Orders Data:", JSON.stringify(data, null, 2));
  }

  const { data: activations } = await supabase.from('package_activations').select('*');
  console.log("Activations:", JSON.stringify(activations, null, 2));
}

debugOrders();
