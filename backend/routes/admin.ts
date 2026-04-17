import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { authenticate, requireAdmin, requireSuperAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/stats', authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const [props, users, pending, sold, revenue] = await Promise.all([
      query("SELECT COUNT(*) FROM properties WHERE status='approved'"),
      query("SELECT COUNT(*) FROM users WHERE role='user'"),
      query("SELECT COUNT(*) FROM properties WHERE status='pending'"),
      query("SELECT COUNT(*) FROM properties WHERE status='sold'"),
      query("SELECT COALESCE(SUM(amount),0) as total FROM payment_requests WHERE status='completed'"),
    ]);
    res.json({
      totalProperties: parseInt(props.rows[0].count),
      totalUsers: parseInt(users.rows[0].count),
      pendingProperties: parseInt(pending.rows[0].count),
      soldProperties: parseInt(sold.rows[0].count),
      totalRevenue: parseFloat(revenue.rows[0].total),
    });
  } catch {
    res.status(500).json({ error: 'خطأ' });
  }
});

router.get('/properties', authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT p.*,
        u.name as owner_name, u.email as owner_email, u.phone as owner_phone, u.created_at as owner_joined,
        (SELECT pi.url FROM property_images pi WHERE pi.property_id = p.id AND pi.is_primary=true LIMIT 1) as primary_image,
        (SELECT json_agg(pi.url) FROM property_images pi WHERE pi.property_id = p.id) as images
      FROM properties p LEFT JOIN users u ON u.id = p.owner_id ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'خطأ' });
  }
});

router.get('/properties/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT p.*,
        u.name as owner_name, u.email as owner_email, u.phone as owner_phone, u.created_at as owner_joined,
        u.id as owner_user_id,
        (SELECT json_agg(pi.url ORDER BY pi.is_primary DESC) FROM property_images pi WHERE pi.property_id = p.id) as images
      FROM properties p LEFT JOIN users u ON u.id = p.owner_id WHERE p.id=$1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'العقار غير موجود' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'خطأ' });
  }
});

router.patch('/properties/:id/approve', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const sub = req.user!.sub_role;
    if (sub && sub !== 'property_manager' && req.user!.role !== 'superadmin') {
      return res.status(403).json({ error: 'صلاحية مدير العقارات فقط' });
    }
    const { contact_phone, is_featured, down_payment, delivery_status } = req.body || {};
    await query(
      `UPDATE properties SET
        status='approved',
        approved_by=$1,
        approved_at=NOW(),
        contact_phone=COALESCE($2, contact_phone),
        is_featured=COALESCE($3, is_featured),
        down_payment=COALESCE($4, down_payment),
        delivery_status=COALESCE($5, delivery_status),
        updated_at=NOW()
      WHERE id=$6`,
      [req.user!.id, contact_phone || null, typeof is_featured === 'boolean' ? is_featured : null, down_payment || null, delivery_status || null, req.params.id]
    );
    // Notify property owner
    try {
      const propRes = await query('SELECT owner_id, title, title_ar FROM properties WHERE id=$1', [req.params.id]);
      if (propRes.rows[0]?.owner_id) {
        const prop = propRes.rows[0];
        await query(
          `INSERT INTO notifications (user_id, type, title, message, link) VALUES ($1,'property_approved','تمت الموافقة على عقارك',$2,$3)`,
          [prop.owner_id, `تمت الموافقة على عقارك: ${prop.title_ar || prop.title}`, `/properties/${req.params.id}`]
        );
      }
    } catch {}
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'خطأ' });
  }
});

router.patch('/properties/:id/reject', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await query("UPDATE properties SET status='rejected' WHERE id=$1", [req.params.id]);
    // Notify property owner
    try {
      const propRes = await query('SELECT owner_id, title, title_ar FROM properties WHERE id=$1', [req.params.id]);
      if (propRes.rows[0]?.owner_id) {
        const prop = propRes.rows[0];
        await query(
          `INSERT INTO notifications (user_id, type, title, message) VALUES ($1,'property_rejected','تم رفض عقارك',$2)`,
          [prop.owner_id, `للأسف، تم رفض عقارك: ${prop.title_ar || prop.title}. يمكنك التواصل مع الإدارة لمعرفة السبب.`]
        );
      }
    } catch {}
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'خطأ' });
  }
});

router.patch('/properties/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is trying to edit a property they don't own (only superadmin can edit user properties)
    if (req.user!.role !== 'superadmin') {
      const propOwnerRes = await query('SELECT owner_id FROM properties WHERE id=$1', [req.params.id]);
      if (propOwnerRes.rows.length === 0) return res.status(404).json({ error: 'العقار غير موجود' });
      const prop = propOwnerRes.rows[0];
      // If the property has an owner (user-submitted) and the current user is not superadmin, prevent edit
      if (prop.owner_id && prop.owner_id !== req.user!.id) {
        return res.status(403).json({ error: 'حدث خطا' });
      }
    }
    const {
      title, title_ar, description, description_ar, price, area, rooms, bedrooms, bathrooms, district,
      city, address, type, purpose, floor, contact_phone, is_featured, down_payment, delivery_status,
      google_maps_url, floor_plan_image, is_furnished, has_parking, has_elevator, has_pool, has_garden,
      has_basement, finishing_type
    } = req.body;
    await query(
      `UPDATE properties SET
        title=COALESCE($1,title), title_ar=COALESCE($2,title_ar),
        description=COALESCE($3,description), description_ar=COALESCE($4,description_ar),
        price=COALESCE($5,price), area=COALESCE($6,area), rooms=COALESCE($7,rooms),
        bedrooms=COALESCE($8,bedrooms), bathrooms=COALESCE($9,bathrooms), district=COALESCE($10,district),
        city=COALESCE($11,city), address=COALESCE($12,address), type=COALESCE($13,type),
        purpose=COALESCE($14,purpose), floor=COALESCE($15,floor), contact_phone=COALESCE($16,contact_phone),
        is_featured=COALESCE($17,is_featured), down_payment=COALESCE($18,down_payment),
        delivery_status=COALESCE($19,delivery_status),
        google_maps_url=COALESCE($20,google_maps_url),
        floor_plan_image=COALESCE($21,floor_plan_image),
        is_furnished=COALESCE($22,is_furnished), has_parking=COALESCE($23,has_parking),
        has_elevator=COALESCE($24,has_elevator), has_pool=COALESCE($25,has_pool),
        has_garden=COALESCE($26,has_garden), has_basement=COALESCE($27,has_basement),
        finishing_type=COALESCE($28,finishing_type),
        updated_at=NOW()
      WHERE id=$29`,
      [
        title, title_ar, description, description_ar, price, area, rooms, bedrooms || rooms, bathrooms,
        district, city, address, type, purpose, floor, contact_phone,
        typeof is_featured === 'boolean' ? is_featured : null, down_payment, delivery_status,
        google_maps_url || null, floor_plan_image || null,
        typeof is_furnished === 'boolean' ? is_furnished : null,
        typeof has_parking === 'boolean' ? has_parking : null,
        typeof has_elevator === 'boolean' ? has_elevator : null,
        typeof has_pool === 'boolean' ? has_pool : null,
        typeof has_garden === 'boolean' ? has_garden : null,
        typeof has_basement === 'boolean' ? has_basement : null,
        finishing_type || null,
        req.params.id
      ]
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'خطأ في تعديل العقار' });
  }
});

router.delete('/properties/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await query('DELETE FROM property_images WHERE property_id=$1', [req.params.id]);
    await query('DELETE FROM properties WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'خطأ في حذف العقار' });
  }
});

router.get('/properties/:id/images', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT * FROM property_images WHERE property_id=$1 ORDER BY order_index, id', [req.params.id]);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'خطأ' });
  }
});

router.delete('/properties/:id/images/:imageId', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await query('DELETE FROM property_images WHERE id=$1 AND property_id=$2', [req.params.imageId, req.params.id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'خطأ في حذف الصورة' });
  }
});

router.post('/properties/:id/images', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { url, is_primary } = req.body;
    if (!url) return res.status(400).json({ error: 'رابط الصورة مطلوب' });
    if (is_primary) {
      await query('UPDATE property_images SET is_primary=false WHERE property_id=$1', [req.params.id]);
    }
    const result = await query(
      'INSERT INTO property_images (property_id, url, is_primary, order_index) VALUES ($1,$2,$3,0) RETURNING *',
      [req.params.id, url, Boolean(is_primary)]
    );
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'خطأ في إضافة الصورة' });
  }
});

router.patch('/properties/:id/images/:imageId/primary', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await query('UPDATE property_images SET is_primary=false WHERE property_id=$1', [req.params.id]);
    await query('UPDATE property_images SET is_primary=true WHERE id=$1 AND property_id=$2', [req.params.imageId, req.params.id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'خطأ' });
  }
});

router.patch('/properties/:id/sold', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { buyer_id } = req.body;
    await query(
      "UPDATE properties SET status='sold', sold_to=$1, sold_at=NOW(), owner_id=$2 WHERE id=$3",
      [buyer_id || null, req.user!.id, req.params.id]
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'خطأ' });
  }
});

router.get('/users', authenticate, requireSuperAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT id, name, email, phone, role, sub_role, is_active, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'خطأ' });
  }
});

router.patch('/users/:id/role', authenticate, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { role, sub_role } = req.body;
    await query('UPDATE users SET role=$1, sub_role=$2 WHERE id=$3', [role, sub_role || null, req.params.id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'خطأ' });
  }
});

router.patch('/users/:id/toggle', authenticate, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await query('UPDATE users SET is_active = NOT is_active WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'خطأ' });
  }
});

router.patch('/users/:id/reset-password', authenticate, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    const hash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.params.id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'خطأ في تغيير كلمة المرور' });
  }
});

router.get('/analytics', authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const [byType, byDistrict, byMonth, payments, monthlyRevenue, casesByMonth] = await Promise.all([
      query("SELECT type, COUNT(*) as count FROM properties WHERE status='approved' GROUP BY type"),
      query("SELECT district, COUNT(*) as count FROM properties WHERE status='approved' GROUP BY district ORDER BY count DESC LIMIT 8"),
      query(`SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month_key,
                    TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as month,
                    COUNT(*) as count, COALESCE(SUM(price), 0) as total_value
             FROM properties WHERE status='approved' AND created_at > NOW() - INTERVAL '12 months'
             GROUP BY month_key, month ORDER BY month_key`),
      query("SELECT payment_method, COUNT(*) as count, SUM(amount) as total FROM payment_requests WHERE status='completed' GROUP BY payment_method"),
      query(`SELECT TO_CHAR(DATE_TRUNC('month', processed_at), 'YYYY-MM') as month_key,
                    TO_CHAR(DATE_TRUNC('month', processed_at), 'Mon') as month,
                    COUNT(*) as deals, COALESCE(SUM(amount), 0) as revenue
             FROM payment_requests WHERE status='completed' AND processed_at > NOW() - INTERVAL '12 months'
             GROUP BY month_key, month ORDER BY month_key`),
      query(`SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month_key,
                    TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as month,
                    COUNT(*) FILTER (WHERE status='pending') as pending,
                    COUNT(*) FILTER (WHERE status='approved') as approved,
                    COUNT(*) FILTER (WHERE status='rejected') as rejected,
                    COUNT(*) FILTER (WHERE status='sold') as sold
             FROM properties WHERE created_at > NOW() - INTERVAL '12 months'
             GROUP BY month_key, month ORDER BY month_key`),
    ]);
    res.json({
      byType: byType.rows,
      byDistrict: byDistrict.rows,
      byMonth: byMonth.rows,
      payments: payments.rows,
      monthlyRevenue: monthlyRevenue.rows,
      casesByMonth: casesByMonth.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ' });
  }
});

router.get('/payments', authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT pr.*, u.name as buyer_name, u.phone as buyer_phone, p.title as property_title
      FROM payment_requests pr
      JOIN users u ON u.id = pr.buyer_id
      JOIN properties p ON p.id = pr.property_id
      ORDER BY pr.created_at DESC
    `);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'خطأ' });
  }
});

router.patch('/payments/:id/approve', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await query("UPDATE payment_requests SET status='completed', processed_by=$1, processed_at=NOW() WHERE id=$2",
      [req.user!.id, req.params.id]);
    const pr = await query('SELECT property_id, buyer_id FROM payment_requests WHERE id=$1', [req.params.id]);
    const { property_id, buyer_id } = pr.rows[0];
    await query("UPDATE properties SET status='sold', sold_to=$1, sold_at=NOW(), owner_id=$2 WHERE id=$3",
      [buyer_id, req.user!.id, property_id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'خطأ' });
  }
});

export default router;
