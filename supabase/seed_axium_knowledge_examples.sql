-- Optional Axium Knowledge seed examples.
-- Replace these two UUIDs before running in Supabase SQL editor.

with seed_context as (
  select
    '00000000-0000-0000-0000-000000000000'::uuid as workspace_id,
    '00000000-0000-0000-0000-000000000000'::uuid as user_id
),
seed_assets as (
  insert into public.data_assets (
    workspace_id,
    created_by,
    asset_name,
    asset_type,
    source_platform,
    description,
    source_of_truth_level,
    status,
    known_limitations
  )
  select workspace_id, user_id, 'Datorama eCom Retailer Sales Dashboard', 'dashboard', 'Datorama',
    'Dashboard used for eCommerce retailer sales reporting, portfolio mix, top SKU analysis and sales performance.',
    'primary', 'active', null
  from seed_context
  union all
  select workspace_id, user_id, 'Datorama Social Media Dashboard', 'dashboard', 'Datorama',
    'Dashboard used to analyze paid social and campaign performance.',
    'primary', 'active', 'Some creative previews may not render due to connector limitations.'
  from seed_context
  returning id, asset_name
),
seed_product_asset as (
  insert into public.data_assets (
    workspace_id,
    created_by,
    asset_name,
    asset_type,
    source_platform,
    description,
    source_of_truth_level,
    status
  )
  select workspace_id, user_id, 'Product mapping file', 'file', 'Excel',
    'Product reference file used to map ASIN values to product names, category and portfolio classification.',
    'reference_only', 'active'
  from seed_context
  returning id
),
seed_sales_asset as (
  insert into public.data_assets (
    workspace_id,
    created_by,
    asset_name,
    asset_type,
    source_platform,
    description,
    source_of_truth_level,
    status
  )
  select workspace_id, user_id, 'Amazon sales export', 'dataset', 'CSV',
    'Amazon sales export containing sales metrics by ASIN.',
    'secondary', 'active'
  from seed_context
  returning id
)
insert into public.knowledge_entries (
  workspace_id,
  created_by,
  title,
  type,
  description,
  affected_system,
  affected_dashboard,
  affected_metric,
  status,
  confidence_level,
  recommended_action
)
select workspace_id, user_id, 'Ad spend missing for March', 'Data Quality Issue',
  'March ad spend was not enabled for the uploaded media source, so ROAS and cost-based metrics may be incomplete.',
  'Media reporting', null, 'Ad Spend, ROAS, Cost per Conversion', 'resolved', 'confirmed',
  'Use updated file after ad spend was enabled.'
from seed_context
union all
select workspace_id, user_id, 'New GA4 connection added after go-live', 'Connection Change',
  'GA4 connection was added after website go-live, so data before the connection date may be incomplete or based on test tracking.',
  'GA4', 'Website Dashboard', null, 'active', 'high',
  'Check launch date and exclude test period where needed.'
from seed_context
union all
select workspace_id, user_id, 'Negative revenue caused by returns', 'Metric Definition',
  'Revenue can appear negative when return transactions are included in the selected period.',
  'Sales reporting', null, 'Revenue', 'active', 'confirmed',
  'Check whether returns should be included or excluded for the business question.'
from seed_context;

with seed_context as (
  select
    '00000000-0000-0000-0000-000000000000'::uuid as workspace_id,
    '00000000-0000-0000-0000-000000000000'::uuid as user_id
),
sales_asset as (
  select id from public.data_assets where workspace_id = (select workspace_id from seed_context) and asset_name = 'Amazon sales export' limit 1
),
product_asset as (
  select id from public.data_assets where workspace_id = (select workspace_id from seed_context) and asset_name = 'Product mapping file' limit 1
)
insert into public.fields_catalog (
  workspace_id,
  created_by,
  field_name,
  field_type,
  source_asset_id,
  description,
  can_be_used_for_join,
  join_quality,
  pii_level,
  status
)
select workspace_id, user_id, 'ASIN', 'id', (select id from sales_asset),
  'Amazon product identifier used to map Amazon sales data to product classifications.',
  true, 'strong', 'none', 'active'
from seed_context;

with seed_context as (
  select
    '00000000-0000-0000-0000-000000000000'::uuid as workspace_id,
    '00000000-0000-0000-0000-000000000000'::uuid as user_id
),
datorama_asset as (
  select id from public.data_assets where workspace_id = (select workspace_id from seed_context) and asset_name = 'Datorama Social Media Dashboard' limit 1
)
insert into public.metrics_catalog (
  workspace_id,
  created_by,
  metric_name,
  business_definition,
  technical_definition,
  source_asset_id,
  aggregation_type,
  grain,
  known_issues,
  status
)
select workspace_id, user_id, 'Buy Now Clicks',
  'Number of user clicks on Buy Now CTA elements.',
  'Usually captured from GA4 or GTM event tracking, depending on market setup.',
  (select id from datorama_asset), 'sum', 'event',
  'May be affected by ChannelSight widget implementation or broken GTM event setup.',
  'active'
from seed_context;

with seed_context as (
  select
    '00000000-0000-0000-0000-000000000000'::uuid as workspace_id,
    '00000000-0000-0000-0000-000000000000'::uuid as user_id
),
sales_asset as (
  select id from public.data_assets where workspace_id = (select workspace_id from seed_context) and asset_name = 'Amazon sales export' limit 1
),
product_asset as (
  select id from public.data_assets where workspace_id = (select workspace_id from seed_context) and asset_name = 'Product mapping file' limit 1
)
insert into public.cross_reference_rules (
  workspace_id,
  created_by,
  rule_name,
  primary_asset_id,
  secondary_asset_id,
  join_field_primary,
  join_field_secondary,
  join_type,
  join_quality,
  use_case,
  warning,
  status
)
select workspace_id, user_id, 'Amazon sales to product mapping by ASIN',
  (select id from sales_asset), (select id from product_asset), 'ASIN', 'ASIN',
  'lookup', 'strong',
  'Add category, product name and portfolio classification to Amazon sales data.',
  'Mapping must be updated when new ASINs are introduced.',
  'active'
from seed_context;
