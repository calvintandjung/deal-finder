-- Add sources_used column to track which data sources successfully found contact info
ALTER TABLE skip_trace_requests 
ADD COLUMN IF NOT EXISTS sources_used TEXT[];

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_skip_trace_status_cost 
ON skip_trace_requests(status, cost);

-- Add comment describing the column
COMMENT ON COLUMN skip_trace_requests.sources_used IS 
'Array of data sources that successfully found contact information. Examples: voter-registry, wa-sos, whitepages-api, batchleads, king-county-bulk';

-- View for skip trace analytics
CREATE OR REPLACE VIEW skip_trace_analytics AS
SELECT 
  service,
  status,
  COUNT(*) as total_requests,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
  SUM(cost) as total_cost,
  ROUND(AVG(cost), 3) as avg_cost_per_request,
  ROUND(AVG(CASE WHEN status = 'completed' THEN cost END), 3) as avg_cost_successful
FROM skip_trace_requests
GROUP BY service, status
ORDER BY total_requests DESC;

-- View for recent skip trace activity
CREATE OR REPLACE VIEW recent_skip_traces AS
SELECT 
  st.id,
  st.created_at,
  p.address,
  p.city,
  p.owner_name,
  st.service,
  st.status,
  st.phone_numbers,
  st.email_addresses,
  st.cost,
  st.sources_used
FROM skip_trace_requests st
JOIN properties p ON st.property_id = p.id
ORDER BY st.created_at DESC
LIMIT 50;

-- Function to calculate total skip trace cost for a date range
CREATE OR REPLACE FUNCTION skip_trace_cost_summary(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_requests BIGINT,
  successful_requests BIGINT,
  failed_requests BIGINT,
  total_cost NUMERIC,
  avg_cost NUMERIC,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_requests,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_requests,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_requests,
    COALESCE(SUM(cost), 0) as total_cost,
    COALESCE(ROUND(AVG(cost), 3), 0) as avg_cost,
    ROUND(100.0 * SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
  FROM skip_trace_requests
  WHERE created_at::DATE BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT * FROM skip_trace_cost_summary();
-- SELECT * FROM skip_trace_cost_summary('2026-03-01', '2026-03-31');
