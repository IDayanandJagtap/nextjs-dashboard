"use server";

import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirect } from "next/navigation";

// Creates a schema for data validation and type coercin
const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({ invalid_type_error: "Please select a customer" }),
    amount: z.coerce.number().gt(0, "Please enter a amount greater than $0"),
    status: z.enum(["pending", "paid"], {
        invalid_type_error: "Please select a status",
    }),
    date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export type State = {
    errors?: {
        customerId?: string[];
        amount?: string[];
        status?: string[];
    };
    message: string | null;
};

export const createInvoice = async (prevState: State, formData: FormData) => {
    // Validate form using Zod
    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get("customerId"),
        amount: formData.get("amount"),
        status: formData.get("status"),
    });

    // If form validation fails, return errors early. Otherwise, continue.
    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Missing Fields. Failed to Create Invoice.",
        };
    }

    // Prepare data for insertion into the database
    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split("T")[0];

    try {
        // Run a sql query;
        await sql`INSERT INTO invoices (customer_id, amount, status, date)
            VALUES (${customerId}, ${amountInCents}, ${status}, ${date}  )`;
    } catch (err) {
        return { message: "Database error : Failed to create an invoice" };
    }
    revalidatePath("/dashboard/invoices");
    redirect("/dashboard/invoices");
};

const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export const updateInvoice = async (
    id: string,
    prevState: State,
    formData: FormData
) => {
    const validatedFields = UpdateInvoice.safeParse({
        customerId: formData.get("customerId"),
        amount: formData.get("amount"),
        status: formData.get("status"),
    });

    if (!validatedFields.success) {
        console.log(validatedFields.error.flatten().fieldErrors);
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Missing Fields. Failed to Create Invoice.",
        };
    }

    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;

    try {
        await sql`UPDATE invoices 
        SET customer_id=${customerId}, amount=${amountInCents}, status=${status}
        WHERE id=${id}`;
    } catch (err) {
        return { message: "Database error : Failed to update invoice" };
    }

    revalidatePath("/dashboard/invoices");
    redirect("/dashboard/invoices");
};

export const deleteInvoice = async (id: string) => {
    try {
        await sql`DELETE FROM invoices WHERE id=${id}`;
        revalidatePath("/dashboard/invoices");
        return { message: "Deleted invoice!" };
    } catch (err) {
        return { message: "Database error : Failed to delete the invoice" };
    }
};
