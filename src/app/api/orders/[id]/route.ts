import { cloudDb } from '@/lib/cloudDb';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { serverError } from '@/lib/serverApi';

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const status = body.status; // 'COMPLETED' or 'REJECTED'

    const params = await props.params;

    const client = await cloudDb.connect();
    try {
      await client.sql`
        UPDATE nexo_orders
        SET order_status = ${status}
        WHERE id = ${params.id} AND user_id = ${userId}
      `;
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError(error);
  }
}
