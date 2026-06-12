import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { S3Client, GetObjectCommand } from 'npm:@aws-sdk/client-s3@3.0.0';
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { order_id } = await req.json();
    if (!order_id) return Response.json({ error: 'order_id required' }, { status: 400 });

    // 注文をユーザー自身のものか確認
    const orders = await base44.asServiceRole.entities.ProductOrder.filter({ id: order_id });
    const order = orders[0];
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
    if (order.buyer_email !== user.email) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (order.status !== 'completed') return Response.json({ error: '決済が完了していません' }, { status: 400 });
    if (!order.is_digital) return Response.json({ error: 'デジタルファイルが存在しません' }, { status: 400 });

    // custom_order: 納品済み(delivered)の場合のみ delivered_file_url を使用
    let downloadFileUrl = order.file_url;
    let downloadFileName = order.file_name;
    if (order.delivery_mode === 'custom_order') {
      if (order.delivery_status !== 'delivered') {
        return Response.json({ error: 'まだ納品が完了していません。販売者からの納品をお待ちください。' }, { status: 400 });
      }
      if (!order.delivered_file_url) {
        return Response.json({ error: '納品ファイルが見つかりません' }, { status: 404 });
      }
      downloadFileUrl = order.delivered_file_url;
      downloadFileName = order.delivered_file_name || order.file_name || 'download';
    } else {
      if (!downloadFileUrl) return Response.json({ error: 'ダウンロードファイルが存在しません' }, { status: 400 });
    }

    // ダウンロード有効期限チェック（instant のみ）
    if (order.delivery_mode !== 'custom_order' && order.download_expires_at && new Date(order.download_expires_at) < new Date()) {
      return Response.json({ error: 'ダウンロード期限が切れています' }, { status: 403 });
    }

    // S3署名付きURL生成（15分有効）
    const s3 = new S3Client({
      region: Deno.env.get('AWS_REGION'),
      credentials: {
        accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY'),
      },
    });

    // file_url は "s3://bucket/key" 形式 または "https://..." 形式を想定
    let bucket, key;
    if (downloadFileUrl.startsWith('s3://')) {
      const withoutScheme = downloadFileUrl.replace('s3://', '');
      const slash = withoutScheme.indexOf('/');
      bucket = withoutScheme.substring(0, slash);
      key = withoutScheme.substring(slash + 1);
    } else {
      const url = new URL(downloadFileUrl);
      bucket = url.hostname.split('.')[0];
      key = url.pathname.replace(/^\//, '');
    }

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${downloadFileName || 'download'}"`,
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 900 }); // 15分

    // ダウンロード回数をインクリメント
    await base44.asServiceRole.entities.ProductOrder.update(order_id, {
      download_count: (order.download_count || 0) + 1,
    });

    return Response.json({ signed_url: signedUrl, file_name: downloadFileName });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});