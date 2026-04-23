import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { cors } from 'hono/cors';
import { useSession } from '@hono/session';
import { OAuth2Client } from 'google-auth-library';
import db from './lib/database.js';
import generator from './lib/generator.js';
import format from './lib/format.js';

const SERVER_PORT = Number(process.env.SERVER_PORT);
const CORS_ORIGIN_BASE_URL = process.env.CORS_ORIGIN_BASE_URL;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const AUTH_SECRET = process.env.AUTH_SECRET;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

if (!AUTH_SECRET) {
  throw new Error('AUTH_SECRET is required to enable session encryption');
}

const app = new Hono();

app.use(
  '*',
  cors({
    origin: CORS_ORIGIN_BASE_URL,
    credentials: true,
  }),
);

app.use(
  '*',
  useSession({
    secret: AUTH_SECRET,
    duration: {
      absolute: 60 * 60 * 24 * 7,
      inactivity: 60 * 60 * 24,
    },
    setCookie: (c, name, value, opt) => {
      setCookie(c, name, value, {
        ...opt,
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        secure: process.env.NODE_ENV === 'production',
      });
    },
  }),
);

app.post('/auth/google', loginWithGoogle);
app.get('/auth/session', getCurrentSession);
app.post('/auth/logout', logout);
app.post('/g/new', createGroup);
app.post('/g/:id/new', createGroupPayment);
app.get('/g/:id/info', getGroupInfoById);
app.get('/g/:id/payments/:page', getGroupPaymentsById);
app.patch('/g/:id/basic', updateGroupBasicInfo);
app.patch('/g/:id/members', updateGroupMembers);
app.patch('/g/:id/sub-groups', updateGroupSubGroups);
app.patch('/g/:id/categories', updateGroupCategories);
app.delete('/g/:id', deleteGroup);
app.patch('/g/:id/:pmid', updateGroupPayment);
app.delete('/g/:id/:pmid', deleteGroupPayment);

function normalizeNickname(name, email) {
  const fallback = email?.split('@')[0] || 'user';
  const nickname = (name || fallback).trim();
  return nickname.slice(0, 128) || 'user';
}

function toSessionUser(user) {
  return {
    id: user.id,
    nickname: user.nickname,
    email: user.email,
    icon: user.icon,
  };
}

async function getCurrentSession(c) {
  const sessionUser = await c.var.session.get();

  if (!sessionUser?.id) {
    return c.json({ authenticated: false, user: null });
  }

  return c.json({ authenticated: true, user: sessionUser });
}

async function logout(c) {
  c.var.session.delete();
  return c.json({ ok: true });
}

async function loginWithGoogle(c) {
  const { id_token } = await c.req.json();

  if (!GOOGLE_CLIENT_ID) {
    return c.json({ error: 'Google Client ID Not Configured' }, 500);
  }

  if (!id_token || typeof id_token !== 'string') {
    return c.json({ error: 'id_token is required' }, 400);
  }

  let ticket;

  try {
    ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: GOOGLE_CLIENT_ID,
    });
  } catch (error) {
    console.error('Error verifying Google token:', error);
    return c.json({ error: 'Invalid Google Token' }, 401);
  }

  const payload = ticket.getPayload();

  if (!payload?.sub || !payload?.email) {
    return c.json({ error: 'Invalid Google Token Payload' }, 401);
  }

  const socialId = payload.sub;
  const email = payload.email;
  const nickname = normalizeNickname(payload.name, email);
  const icon = '👤';

  const con = await db.getConnection();

  try {
    await con.beginTransaction();

    const [socialRows] = await con.execute(
      `SELECT u.uid, u.public_uid, u.nickname, u.email, u.icon
       FROM social_accounts sa
       INNER JOIN users u ON sa.uid = u.uid
       WHERE sa.social_id = ? AND u.deleted_at IS NULL
       LIMIT 1`,
      [socialId],
    );

    if (socialRows.length > 0) {
      await con.commit();
      const user = socialRows[0];
      const sessionUser = toSessionUser({
        id: user.public_uid,
        nickname: user.nickname,
        email: user.email,
        icon: user.icon,
      });
      await c.var.session.update(sessionUser);
      return c.json({
        ...sessionUser,
        is_new: false,
      });
    }

    const [existingUsers] = await con.execute(
      'SELECT uid, public_uid, nickname, email, icon FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1',
      [email],
    );

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      await con.execute('INSERT IGNORE INTO social_accounts (uid, social_id) VALUES (?, ?)', [existingUser.uid, socialId]);
      await con.commit();

      const sessionUser = toSessionUser({
        id: existingUser.public_uid,
        nickname: existingUser.nickname,
        email: existingUser.email,
        icon: existingUser.icon,
      });
      await c.var.session.update(sessionUser);

      return c.json({
        ...sessionUser,
        is_new: false,
      });
    }

    const publicUserId = generator.uuid();
    const [insertResult] = await con.execute('INSERT INTO users (public_uid, nickname, email, icon) VALUES (?, ?, ?, ?)', [
      publicUserId,
      nickname,
      email,
      icon,
    ]);

    await con.execute('INSERT INTO social_accounts (uid, social_id) VALUES (?, ?)', [insertResult.insertId, socialId]);
    await con.commit();

    const sessionUser = toSessionUser({
      id: publicUserId,
      nickname,
      email,
      icon,
    });
    await c.var.session.update(sessionUser);

    return c.json(
      {
        ...sessionUser,
        is_new: true,
      },
      201,
    );
  } catch (error) {
    await con.rollback();
    console.error('Error logging in with Google:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  } finally {
    con.release();
  }
}

async function getGroupInfoById(c) {
  const pubGroupId = c.req.param('id');

  try {
    // グループ情報を取得
    const groups = await db.execute('SELECT * FROM grps WHERE public_gid = ? AND deleted_at IS NULL', [pubGroupId]);

    if (groups.length === 0) {
      return c.json({ error: 'Group Not Found' }, 404);
    }

    const group = groups[0];
    const gid = group.gid;

    // 関連データを並列取得
    const [members, subGroups, subGroupMembers, categories] = await Promise.all([
      db.query('SELECT * FROM members WHERE gid = ? AND left_at IS NULL', [gid]),
      db.query('SELECT * FROM sub_groups WHERE (gid, is_disabled) = (?, 0)', [gid]),
      db.query('SELECT * FROM sub_group_members WHERE gid = ?', [gid]),
      db.query('SELECT * FROM categories WHERE (gid, is_disabled) = (?, 0)', [gid]),
    ]);

    // レスポンスを整形
    group.id = pubGroupId;
    group.members = members.map((m) => {
      m.id = m.mmid;
      delete m.gid;
      delete m.mmid;
      delete m.left_at;
      return m;
    });
    group.sub_groups = subGroups.map((sg) => {
      sg.id = sg.sgid;
      delete sg.gid;
      delete sg.sgid;
      delete sg.is_disabled;
      return {
        ...sg,
        members: subGroupMembers.filter((sgm) => sgm.sgid === sg.id).map((sgm) => sgm.mmid),
      };
    });
    group.categories = categories.map((c) => {
      c.id = c.ctid;
      delete c.gid;
      delete c.ctid;
      delete c.is_disabled;
      return c;
    });

    delete group.gid;
    delete group.public_gid;
    delete group.deleted_at;

    return c.json({
      ...group,
    });
  } catch (error) {
    console.error('Error fetching group info:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
}

async function createGroup(c) {
  const { name, description, icon, currency, timezone, start_at, end_at, members } = await c.req.json();

  const publicGroupId = generator.uuid();

  try {
    // グループを作成
    const result = await db.execute(
      'INSERT INTO grps (public_gid, name, description, icon, currency, timezone, start_at, end_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [publicGroupId, name, description, icon, currency, timezone,
        start_at ? format.toMySQLDateTime(start_at) : null, end_at ? format.toMySQLDateTime(end_at) : null],
    );

    const gid = result.insertId;

    if (members && members.length > 0) {
      await Promise.all(
        members.map((m, i) => db.execute('INSERT INTO members (gid, mmid, name, icon) VALUES (?, ?, ?, ?)', [gid, i + 1, m.name, m.icon])),
      );
    }
  } catch (error) {
    console.error('Error creating group:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }

  return c.json({ id: publicGroupId }, 201);
}

async function updateGroupBasicInfo(c) {
  const pubGroupId = c.req.param('id');
  const { name, description, icon, currency, timezone, start_at, end_at } = await c.req.json();

  try {
    // グループ情報を取得
    const groups = await db.execute('SELECT * FROM grps WHERE public_gid = ? AND deleted_at IS NULL', [pubGroupId]);

    if (groups.length === 0) {
      return c.json({ error: 'Group Not Found' }, 404);
    }

    const group = groups[0];
    const gid = group.gid;

    // グループ情報を更新
    await db.execute('UPDATE grps SET name = ?, description = ?, icon = ?, currency = ?, timezone = ?, start_at = ?, end_at = ? WHERE gid = ?', [
      name,
      description,
      icon,
      currency,
      timezone,
      start_at ? format.toMySQLDateTime(start_at) : null,
      end_at ? format.toMySQLDateTime(end_at) : null,
      gid,
    ]);

    return c.json({ id: pubGroupId });
  } catch (error) {
    console.error('Error updating group info:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
}

async function updateGroupMembers(c) {
  const pubGroupId = c.req.param('id');
  const { add, rename } = await c.req.json();

  const con = await db.getConnection();

  try {
    // グループ情報を取得
    const groups = await db.execute('SELECT * FROM grps WHERE public_gid = ? AND deleted_at IS NULL', [pubGroupId]);

    if (groups.length === 0) {
      return c.json({ error: 'Group Not Found' }, 404);
    }

    const group = groups[0];
    const gid = group.gid;

    // トランザクション開始
    await con.beginTransaction();

    // 現在のメンバー情報から、次の mmid を計算
    const [memberMaxRows] = await con.execute('SELECT MAX(mmid) AS max_mmid FROM members WHERE gid = ?', [gid]);
    const beforeMemberMaxId = memberMaxRows[0]?.max_mmid ?? 0;

    // メンバーを追加
    if (add && add.length > 0) {
      await Promise.all(
        add.map((m, i) =>
          con.execute('INSERT INTO members (gid, mmid, name, icon) VALUES (?, ?, ?, ?)', [gid, beforeMemberMaxId + i + 1, m.name, m.icon]),
        ),
      );
    }

    // メンバー名を更新
    if (rename && rename.length > 0) {
      await Promise.all(
        rename.map((m) => con.execute('UPDATE members SET name = ?, icon = ? WHERE (gid, mmid) = (?, ?)', [m.name, m.icon, gid, m.id])),
      );
    }

    await con.commit();

    const [finalMembers] = await con.execute('SELECT * FROM members WHERE gid = ? AND left_at IS NULL', [gid]);

    return c.json({
      id: pubGroupId,
      members: finalMembers.map((m) => {
        m.id = m.mmid;
        delete m.gid;
        delete m.mmid;
        delete m.left_at;
        return m;
      }),
    });
  } catch (error) {
    await con.rollback();
    console.error('Error updating group members:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  } finally {
    con.release();
  }
}

async function updateGroupSubGroups(c) {
  const pubGroupId = c.req.param('id');
  const { add, remove, members, names } = await c.req.json();

  const con = await db.getConnection();

  try {
    // グループ情報を取得
    const groups = await db.execute('SELECT * FROM grps WHERE public_gid = ? AND deleted_at IS NULL', [pubGroupId]);

    if (groups.length === 0) {
      return c.json({ error: 'Group Not Found' }, 404);
    }

    const group = groups[0];
    const gid = group.gid;

    // トランザクション開始
    await con.beginTransaction();

    // 現在のサブグループ情報から、次の sgid を計算
    const [subGroupMaxRows] = await con.execute('SELECT MAX(sgid) AS max_sgid FROM sub_groups WHERE gid = ?', [gid]);
    const beforeSubGroupMaxId = subGroupMaxRows[0]?.max_sgid ?? 0;

    // サブグループとメンバーを追加
    if (add && add.length > 0) {
      await Promise.all(
        add.map((sg, i) =>
          [
            con.execute('INSERT INTO sub_groups (gid, sgid, name) VALUES (?, ?, ?)', [gid, beforeSubGroupMaxId + i + 1, sg.name]),
            ...sg.members.map((sgm, j) =>
              con.execute('INSERT INTO sub_group_members (gid, sgid, mmid) VALUES (?, ?, ?)', [gid, beforeSubGroupMaxId + i + 1, sgm]),
            ),
          ].flat(),
        ),
      );
    }

    // サブグループのメンバーを更新
    if (members && members.length > 0) {
      await Promise.all(members.map((m) => con.execute('DELETE FROM sub_group_members WHERE (gid, sgid) = (?, ?)', [gid, m.id])));
      await Promise.all(
        members.map((m) =>
          m.members.map((mmid) => con.execute('INSERT INTO sub_group_members (gid, sgid, mmid) VALUES (?, ?, ?)', [gid, m.id, mmid])),
        ),
      );
    }

    if (names && names.length > 0) {
      await Promise.all(names.map((n) => con.execute('UPDATE sub_groups SET name = ? WHERE (gid, sgid) = (?, ?)', [n.name, gid, n.id])));
    }

    // サブグループとメンバーを削除
    if (remove && remove.length > 0) {
      await Promise.all(remove.map((sgid) => con.execute('UPDATE sub_groups SET is_disabled = 1 WHERE (gid, sgid) = (?, ?)', [gid, sgid])));
    }

    await con.commit();

    // サブグループとメンバーを結合して取得
    const [finalSubGroups] = await con.execute('SELECT * FROM sub_groups WHERE (gid, is_disabled) = (?, 0)', [gid]);
    const finalSubGroupMembers =
      finalSubGroups.length > 0
        ? await db.query(`SELECT * FROM sub_group_members WHERE gid = ? AND sgid IN (${finalSubGroups.map((sg) => sg.sgid).join(',')})`, [gid])
        : [];

    return c.json({
      id: pubGroupId,
      sub_groups: finalSubGroups.map((sg) => {
        sg.id = sg.sgid;
        delete sg.gid;
        delete sg.sgid;
        delete sg.is_disabled;
        return {
          ...sg,
          members: finalSubGroupMembers.filter((sgm) => sgm.sgid === sg.id).map((sgm) => sgm.mmid),
        };
      }),
    });
  } catch (error) {
    await con.rollback();
    console.error('Error updating group sub-groups:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  } finally {
    con.release();
  }
}

async function updateGroupCategories(c) {
  const pubGroupId = c.req.param('id');
  const { add, remove, rename } = await c.req.json();

  const con = await db.getConnection();

  try {
    // グループ情報を取得
    const groups = await db.execute('SELECT * FROM grps WHERE public_gid = ? AND deleted_at IS NULL', [pubGroupId]);

    if (groups.length === 0) {
      return c.json({ error: 'Group Not Found' }, 404);
    }

    const group = groups[0];
    const gid = group.gid;

    // トランザクション開始
    await con.beginTransaction();

    // 現在のカテゴリ情報から、次の ctid を計算
    const [categoryMaxRows] = await con.execute('SELECT MAX(ctid) AS max_ctid FROM categories WHERE gid = ?', [gid]);
    const beforeCategoryMaxId = categoryMaxRows[0]?.max_ctid ?? 0;

    // カテゴリを追加
    if (add && add.length > 0) {
      await Promise.all(
        add.map((c, i) => con.execute('INSERT INTO categories (gid, ctid, name) VALUES (?, ?, ?)', [gid, beforeCategoryMaxId + i + 1, c.name])),
      );
    }

    // カテゴリを削除
    if (remove && remove.length > 0) {
      await Promise.all(remove.map((ctid) => con.execute('UPDATE categories SET is_disabled = 1 WHERE (gid, ctid) = (?, ?)', [gid, ctid])));
    }

    // カテゴリ名を更新
    if (rename && rename.length > 0) {
      await Promise.all(rename.map((r) => con.execute('UPDATE categories SET name = ? WHERE (gid, ctid) = (?, ?)', [r.name, gid, r.id])));
    }

    await con.commit();

    const [finalCategories] = await con.execute('SELECT * FROM categories WHERE gid = ? AND is_disabled = 0', [gid]);

    return c.json({
      id: pubGroupId,
      categories: finalCategories.map((c) => {
        c.id = c.ctid;
        delete c.gid;
        delete c.ctid;
        delete c.is_disabled;
        return c;
      }),
    });
  } catch (error) {
    await con.rollback();
    console.error('Error updating group categories:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  } finally {
    con.release();
  }
}

async function deleteGroup(c) {
  const pubGroupId = c.req.param('id');

  try {
    // グループ情報を取得
    const groups = await db.execute('SELECT * FROM grps WHERE public_gid = ? AND deleted_at IS NULL', [pubGroupId]);

    if (groups.length === 0) {
      return c.json({ error: 'Group Not Found' }, 404);
    }

    const group = groups[0];
    const gid = group.gid;

    // グループを論理削除
    await db.execute('UPDATE grps SET deleted_at = NOW() WHERE gid = ?', [gid]);

    return c.json({ id: pubGroupId });
  } catch (error) {
    console.error('Error deleting group:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
}

async function getGroupPaymentsById(c) {
  const pubGroupId = c.req.param('id');
  const page = Number(c.req.param('page')) || 1;
  const limit = 30;
  const offset = (page - 1) * limit;

  try {
    // グループ情報を取得
    const groups = await db.execute('SELECT * FROM grps WHERE public_gid = ? AND deleted_at IS NULL', [pubGroupId]);

    if (groups.length === 0) {
      return c.json({ error: 'Group Not Found' }, 404);
    }

    const group = groups[0];
    const gid = group.gid;

    // 支払い情報を取得
    const paymentsCount = await db.query('SELECT COUNT(pmid) AS count FROM payments WHERE gid = ? AND is_disabled = 0', [gid]);
    const payments = await db.query('SELECT * FROM payments WHERE gid = ? AND is_disabled = 0 LIMIT ? OFFSET ?', [gid, limit, offset]);

    if (payments.length > 0) {
      const payees = await db.query(`SELECT * FROM payees WHERE gid = ? AND pmid IN (${payments.map((p) => p.pmid).join(',')})`, [gid]);
      payments.forEach((p) => {
        p.payees = payees.filter((payee) => payee.pmid === p.pmid).map((payee) => payee.mmid);
      });
    }

    return c.json({
      group_id: pubGroupId,
      payments: payments.map((p) => {
        p.id = p.pmid;
        p.payer = p.paid_by;
        delete p.gid;
        delete p.pmid;
        delete p.deleted_at;
        delete p.is_disabled;
        delete p.paid_by;
        return p;
      }),
      total: paymentsCount[0].count,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error fetching group payments:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
}

async function createGroupPayment(c) {
  const pubGroupId = c.req.param('id');
  const { name, description, amount, paid_at, currency, exchange_rate, type, payer, payees } = await c.req.json();

  const con = await db.getConnection();

  try {
    // グループ情報を取得
    const groups = await db.execute('SELECT * FROM grps WHERE public_gid = ? AND deleted_at IS NULL', [pubGroupId]);

    if (groups.length === 0) {
      return c.json({ error: 'Group Not Found' }, 404);
    }

    const group = groups[0];
    const gid = group.gid;

    // トランザクション開始
    await con.beginTransaction();

    // 現在の支払情報から、次の pmid を計算
    const [paymentMaxRows] = await con.execute('SELECT MAX(pmid) AS max_pmid FROM payments WHERE gid = ? FOR UPDATE', [gid]);
    const beforePaymentMaxId = paymentMaxRows[0]?.max_pmid ?? 0;

    // 支払いを作成
    await con.execute(
      'INSERT INTO payments (gid, pmid, name, description, amount, paid_at, currency, exchange_rate, type, paid_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [gid, beforePaymentMaxId + 1, name, description, amount, format.toMySQLDateTime(paid_at), currency, exchange_rate, type, payer],
    );

    // 受け取り者を作成
    await Promise.all(
      payees.map((mmid) => con.execute('INSERT INTO payees (gid, pmid, mmid) VALUES (?, ?, ?)', [gid, beforePaymentMaxId + 1, mmid])),
    );

    await con.commit();

    const [pmData] = await db.query('SELECT * FROM payments WHERE (gid, pmid, is_disabled) = (?, ?, 0)', [gid, beforePaymentMaxId + 1]);
    const payeesData = await db.query('SELECT * FROM payees WHERE (gid, pmid) = (?, ?)', [gid, beforePaymentMaxId + 1]);

    pmData.id = pmData.pmid;
    pmData.payer = pmData.paid_by;
    pmData.payees = payeesData.map((payee) => payee.mmid);
    delete pmData.gid;
    delete pmData.pmid;
    delete pmData.deleted_at;
    delete pmData.is_disabled;
    delete pmData.paid_by;
    return c.json({ group_id: pubGroupId, ...pmData }, 201);
  } catch (error) {
    console.error('Error creating payment:', error);
    await con.rollback();
    return c.json({ error: 'Internal Server Error' }, 500);
  } finally {
    con.release();
  }
}

async function updateGroupPayment(c) {
  const pubGroupId = c.req.param('id');
  const pmid = c.req.param('pmid');
  const { name, description, amount, paid_at, currency, exchange_rate, type, payer, payees } = await c.req.json();

  const con = await db.getConnection();

  try {
    // グループ情報を取得
    const groups = await db.execute('SELECT * FROM grps WHERE public_gid = ? AND deleted_at IS NULL', [pubGroupId]);

    if (groups.length === 0) {
      return c.json({ error: 'Group Not Found' }, 404);
    }

    const group = groups[0];
    const gid = group.gid;

    // トランザクション開始
    await con.beginTransaction();

    // 支払い情報を更新
    await con.execute(
      'UPDATE payments SET name = ?, description = ?, amount = ?, paid_at = ?, currency = ?, exchange_rate = ?, type = ?, paid_by = ? WHERE (gid, pmid) = (?, ?)',
      [name, description, amount, format.toMySQLDateTime(paid_at), currency, exchange_rate, type, payer, gid, pmid],
    );

    // 受け取り者を更新
    await con.execute('DELETE FROM payees WHERE (gid, pmid) = (?, ?)', [gid, pmid]);
    await Promise.all(payees.map((mmid) => con.execute('INSERT INTO payees (gid, pmid, mmid) VALUES (?, ?, ?)', [gid, pmid, mmid])));

    await con.commit();

    const pmData = {
      id: Number(pmid),
      name,
      description,
      amount,
      paid_at,
      currency,
      exchange_rate,
      type,
      payer,
      payees,
    };

    return c.json({ group_id: pubGroupId, ...pmData });
  } catch (error) {
    console.error('Error updating payment:', error);
    await con.rollback();
    return c.json({ error: 'Internal Server Error' }, 500);
  } finally {
    con.release();
  }
}

async function deleteGroupPayment(c) {
  const pubGroupId = c.req.param('id');
  const pmid = c.req.param('pmid');

  const con = await db.getConnection();

  try {
    // グループ情報を取得
    const groups = await db.execute('SELECT * FROM grps WHERE public_gid = ? AND deleted_at IS NULL', [pubGroupId]);

    if (groups.length === 0) {
      return c.json({ error: 'Group Not Found' }, 404);
    }

    const group = groups[0];
    const gid = group.gid;

    // トランザクション開始
    await con.beginTransaction();

    // 支払いを論理削除
    await con.execute('UPDATE payments SET is_disabled = 1, deleted_at = NOW() WHERE (gid, pmid) = (?, ?)', [gid, pmid]);

    await con.commit();

    return c.json({ group_id: pubGroupId, id: Number(pmid) });
  } catch (error) {
    console.error('Error deleting payment:', error);
    await con.rollback();
    return c.json({ error: 'Internal Server Error' }, 500);
  } finally {
    con.release();
  }
}

serve({ fetch: app.fetch, port: SERVER_PORT }, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`);
});
