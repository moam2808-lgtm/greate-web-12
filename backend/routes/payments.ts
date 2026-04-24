import { Router, Response } from 'express';
import { query } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

async function notifyPurchaseRequest(propertyId: number, buyerId: number, amount: number, paymentMethod: string, screenshotUrl?: string) {
  try {
    const propRes = await query('SELECT title, title_ar, district, contact_phone FROM properties WHERE id=$1', [propertyId]);
    const buyerRes = await query('SELECT name, email, phone FROM users WHERE id=$1', [buyerId]);
    if (!propRes.rows[0] || !buyerRes.rows[0]) return;
    const prop = propRes.rows[0];
    const buyer = buyerRes.rows[0];
    const title = prop.title_ar || prop.title;
    const screenshotNote = screenshotUrl ? ' | تم رفع صورة التحويل ✅' : '';
    const notifMessage = `طلب شراء جديد - العقار: ${title} | المشتري: ${buyer.name} (${buyer.phone}) | المبلغ: ${Number(amount).toLocaleString()} جنيه | طريقة الدفع: ${paymentMethod === 'instapay' ? 'InstaPay' : 'فودافون كاش'}${screenshotNote}`;
    const adminsRes = await query(
      `SELECT id FROM users WHERE role='superadmin' OR (role='admin' AND (sub_role='property_manager' OR sub_role='data_entry' OR sub_role IS NULL))`
    );
    for (const admin of adminsRes.rows) {
      await query(
        `INSERT INTO notifications (user_id, type, title, message, property_data, user_data, link)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          admin.id,
          'purchase_request',
          screenshotUrl ? 'طلب شراء - تم رفع صورة التحويل' : 'طلب شراء جديد',
          notifMessage,
          JSON.stringify({ id: propertyId, title, district: prop.district, price: amount, contact_phone: prop.contact_phone }),
          JSON.stringify({ id: buyerId, name: buyer.name, email: buyer.email, phone: buyer.phone, screenshot_url: screenshotUrl }),
          '/admin?tab=payments'
        ]
      );
    }
  } catch (error) {
    console.error('[payments] Notification error:', error);
  }
}

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { property_id, amount, payment_method, notes, screenshot_url } = req.body;
    
    const propRes = await query("SELECT * FROM properties WHERE id=$1 AND status='approved'", [property_id]);
    if (!propRes.rows[0]) return res.status(404).json({ error: 'العقار غير متاح' });

    const prop = propRes.rows[0];
    const contactPhone = prop.contact_phone || '01100111618';
    
    const result = await query(
      "INSERT INTO payment_requests (property_id, buyer_id, amount, payment_method, notes, screenshot_url, contact_phone, status) VALUES ($1,$2,$3,$4,$5,$6,$7,'pending') RETURNING *",
      [property_id, req.user!.id, amount, payment_method, notes, screenshot_url || null, contactPhone]
    );

    await notifyPurchaseRequest(property_id, req.user!.id, amount, payment_method, screenshot_url);

    res.status(201).json({
      payment: result.rows[0],
      walletInfo: {
        instapay: contactPhone,
        vodafone: contactPhone,
        contact_phone: contactPhone,
        message: `يرجى تحويل مبلغ ${Number(amount).toLocaleString()} جنيه على ${payment_method === 'instapay' ? 'InstaPay' : 'فودافون كاش'}: ${contactPhone}`
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في طلب الدفع' });
  }
});

router.get('/my-payments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT pr.*, p.title as property_title, p.primary_image
      FROM payment_requests pr
      LEFT JOIN (
        SELECT p2.*, (SELECT pi.url FROM property_images pi WHERE pi.property_id = p2.id AND pi.is_primary=true LIMIT 1) as primary_image
        FROM properties p2
      ) p ON p.id = pr.property_id
      WHERE pr.buyer_id = $1 ORDER BY pr.created_at DESC
    `, [req.user!.id]);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'خطأ' });
  }
});

export default router;
