'use server';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
// By adding the 'use server', you mark all the exported functions within the file as server functions.
// These server functions can then be imported into Client and Server components,
//  making them extremely versatile.
import { z } from 'zod';

// Using a type validation library. This schema will validate the formData before saving
// it to a database.

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  //input elements with type="number" actually return a string, not a number!. so, to check, we use
  // a type validation library, in this case, 'zod'
  status: z.enum(['pending', 'paid']),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
  // extract the values of formData, there are a couple of methods you can use.
  // For this example, let's use the .get(name) method.

  //   const rawFormData = {
  //     customerId: formData.get('customerId'),
  //     amount: formData.get('amount'),
  //     status: formData.get('status'),
  //   };

  //   console.log(typeof rawFormData.amount);

  // You can then pass your rawFormData to CreateInvoice to validate the types
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // It's usually good practice to store monetary values in cents in your database to eliminate
  // JavaScript floating-point errors and ensure greater accuracy.
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  //Inserting the data in the database
  await sql`
  INSERT INTO invoices (customer_id, amount, status, date)
  VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
 `;

  // Revalidate and redirect

  //Once the database has been updated, the /dashboard/invoices path will be revalidated, and
  //fresh data will be fetched from the server.
  revalidatePath('/dashboard/invoices');
  //At this point, you also want to redirect the user back to the /dashboard/invoices page.
  //You can do this with the redirect function from Next.js:
  redirect('/dashboard/invoices');
}
