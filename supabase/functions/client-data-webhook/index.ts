
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    // Get the request body
    const body = await req.json()
    console.log('Received webhook data:', body)

    // Validate required fields
    const requiredFields = [
      'client1_name',
      'consultation_date',
      'advisor_name',
      'client1_dob',
      'client1_gross_salary',
      'client1_super_balance'
    ]

    for (const field of requiredFields) {
      if (!body[field]) {
        throw new Error(`Missing required field: ${field}`)
      }
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Insert data into the database
    const { data, error } = await supabaseClient
      .from('clients_financial_data')
      .insert([{
        client1_name: body.client1_name,
        client2_name: body.client2_name || null,
        consultation_date: body.consultation_date,
        advisor_name: body.advisor_name,
        client1_dob: body.client1_dob,
        client2_dob: body.client2_dob || null,
        client1_gross_salary: body.client1_gross_salary,
        client2_gross_salary: body.client2_gross_salary || null,
        client1_super_balance: body.client1_super_balance,
        client2_super_balance: body.client2_super_balance || null
      }])
      .select()
      .single()

    if (error) {
      console.error('Error inserting data:', error)
      throw error
    }

    console.log('Data inserted successfully:', data)

    return new Response(
      JSON.stringify({ success: true, data }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error processing webhook:', error)

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400 
      }
    )
  }
})
