'use server';
import { sql } from '@vercel/postgres';
import { error } from 'console';
import { AuthError } from 'next-auth';
import { signIn } from '@/auth';
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
  customerId: z.string({
    invalid_type_error: 'Please select a customer',
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  //input elements with type="number" actually return a string, not a number!. so, to check, we use
  // a type validation library, in this case, 'zod'
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status',
  }),
  date: z.string(),
});

// customerId - Zod already throws an error if the customer field is empty as it expects a type string.
// But let's add a friendly message if the user doesn't select a customer.

// amount - Since you are coercing the amount type from string to number, it'll default to zero if the string is empty.
// Let's tell Zod we always want the amount greater than 0 with the .gt() function.

// status - Zod already throws an error if the status field is empty as it expects "pending" or "paid".
// Let's also add a friendly message if the user doesn't select a status.

const CreateInvoice = FormSchema.omit({ id: true, date: true });

// This is temporary until @types/react-dom is updated
export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

// formData - same as before.
// prevState - contains the state passed from the useFormState hook.
// You won't be using it in the action in this example, but it's a required prop.
export async function createInvoice(prevState: State, formData: FormData) {
  // extract the values of formData, there are a couple of methods you can use.
  // For this example, let's use the .get(name) method.

  //   const rawFormData = {
  //     customerId: formData.get('customerId'),
  //     amount: formData.get('amount'),
  //     status: formData.get('status'),
  //   };

  //   console.log(typeof rawFormData.amount);

  // You can then pass your rawFormData to CreateInvoice to validate the types
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice',
    };
  }

  // Prepare data for insertion into the database
  const { customerId, amount, status } = validatedFields.data;
  // It's usually good practice to store monetary values in cents in your database to eliminate
  // JavaScript floating-point errors and ensure greater accuracy.
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  //Inserting the data in the database
  try {
    await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
      `;
  } catch (error) {
    // If a database error occurs, return a more specific error.
    return {
      message: 'Database Error: Failed to Create Invoice',
    };
  }

  // Revalidate the cache for the invoices page and redirect the user.

  //Once the database has been updated, the /dashboard/invoices path will be revalidated, and
  //fresh data will be fetched from the server.
  revalidatePath('/dashboard/invoices');
  //At this point, you also want to redirect the user back to the /dashboard/invoices page.
  //You can do this with the redirect function from Next.js:
  redirect('/dashboard/invoices');
}

const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData,
) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    };
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;

  try {
    await sql`
        UPDATE invoices
        SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
        WHERE id = ${id}
      `;
  } catch (error) {
    return { message: 'Database Error: Failed to Update Invoice.' };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  // uncomment code to test error handling
  // throw new Error('Failed to delete invoice');

  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices');
    return { message: 'Deleted Invoice' };
  } catch (error) {
    return { message: 'Database Error: Failed to Delete Invoice.' };
  }
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid Credentials';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}
