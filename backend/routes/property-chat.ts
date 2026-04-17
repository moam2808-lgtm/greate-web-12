import { Router, Response } from 'express';
import { query } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

function isAdminUser(user: AuthRequest['user']): boolean {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  if (user.role === 'admin') return true;
  return false;
}

router.get('/:propertyId/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { propertyId } = req.params;
    const user = req.user!;
    const prop = await query('SELECT owner_id FROM properties WHERE id=$1', [propertyId]);
    if (prop.rows.length === 0) return res.status(404).json({ error: 'العقار غير موجود' });
    
    const isAdminUser = user.role === 'superadmin' || user.role === 'admin';
    
    // If user is not admin, filter to show only their messages and admin replies
    let whereClause = '';
    let params: any[] = [propertyId];
    if (!isAdminUser) {
      whereClause = ' AND (m.sender_id = $2 OR m.is_admin = true)';
      params.push(user.id);
    }
    
    const result = await query(
      `SELECT m.*, u.name as sender_name, u.role as sender_role, u.sub_role as sender_sub_role
       FROM property_chat_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.property_id = $1${whereClause}
       ORDER BY m.created_at ASC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في جلب الرسائل' });
  }
});

router.post('/:propertyId/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { propertyId } = req.params;
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'الرسالة مطلوبة' });
    const prop = await query('SELECT owner_id, title_ar, title FROM properties WHERE id=$1', [propertyId]);
    if (prop.rows.length === 0) return res.status(404).json({ error: 'العقار غير موجود' });
    const isAdmin = isAdminUser(req.user);
    const result = await query(
      `INSERT INTO property_chat_messages (property_id, sender_id, content, is_admin)
       VALUES ($1,$2,$3,$4)
       RETURNING id, property_id, sender_id, content, is_admin, created_at`,
      [propertyId, req.user!.id, content.trim(), isAdmin]
    );
    const msg = result.rows[0];
    const userResult = await query('SELECT name, role, sub_role FROM users WHERE id=$1', [req.user!.id]);
    const sender = userResult.rows[0];

    const propTitle = prop.rows[0].title_ar || prop.rows[0].title;
    const propLink = `/properties/${propertyId}`;

    // Notify all admin/staff when a user sends an inquiry
    if (!isAdmin) {
      try {
        const adminsRes = await query(
          "SELECT id FROM users WHERE role IN ('admin','superadmin') AND is_active=true"
        );
        for (const admin of adminsRes.rows) {
          await query(
            `INSERT INTO notifications (user_id, type, title, message, link)
             VALUES ($1,'property_inquiry','استفسار جديد عن عقار',$2,$3)`,
            [
              admin.id,
              `${sender.name} سأل عن: ${propTitle} - "${content.trim().substring(0, 80)}"`,
              propLink,
            ]
          );
        }
      } catch (notifyErr) {
        console.error('notify inquiry error:', notifyErr);
      }
    }

    // Notify users when admin/staff replies in property chat
    if (isAdmin) {
      try {
        const usersRes = await query(
          `SELECT DISTINCT sender_id FROM property_chat_messages
           WHERE property_id=$1 AND is_admin=false AND sender_id!=$2`,
          [propertyId, req.user!.id]
        );
        for (const u of usersRes.rows) {
          await query(
            `INSERT INTO notifications (user_id, type, title, message, link)
             VALUES ($1,'property_reply','رد جديد على استفسارك',$2,$3)`,
            [
              u.sender_id,
              `${sender.name} رد على استفسارك في عقار: ${propTitle} - "${content.trim().substring(0, 80)}"`,
              propLink,
            ]
          );
        }
      } catch (notifyErr) {
        console.error('notify reply error:', notifyErr);
      }
    }

    res.json({ ...msg, sender_name: sender.name, sender_role: sender.role, sender_sub_role: sender.sub_role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في إرسال الرسالة' });
  }
});

router.get('/my-chats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    let result;
    if (isAdminUser(user)) {
      result = await query(
        `SELECT DISTINCT p.id, p.title, p.title_ar, p.status, p.owner_id,
                u.name as owner_name,
                (SELECT COUNT(*) FROM property_chat_messages WHERE property_id=p.id) as msg_count,
                (SELECT created_at FROM property_chat_messages WHERE property_id=p.id ORDER BY created_at DESC LIMIT 1) as last_msg_at
         FROM properties p
         JOIN users u ON u.id = p.owner_id
         WHERE EXISTS (SELECT 1 FROM property_chat_messages WHERE property_id=p.id)
         ORDER BY last_msg_at DESC NULLS LAST`,
        []
      );
    } else {
      result = await query(
        `SELECT DISTINCT p.id, p.title, p.title_ar, p.status,
                (SELECT COUNT(*) FROM property_chat_messages WHERE property_id=p.id AND sender_id=$1) as msg_count,
                (SELECT created_at FROM property_chat_messages WHERE property_id=p.id ORDER BY created_at DESC LIMIT 1) as last_msg_at
         FROM properties p
         WHERE EXISTS (SELECT 1 FROM property_chat_messages WHERE property_id=p.id AND sender_id=$1)
         ORDER BY last_msg_at DESC NULLS LAST`,
        [user.id]
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ' });
  }
});

export default router;
