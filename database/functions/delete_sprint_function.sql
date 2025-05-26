-- Create a function to delete sprints directly
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION delete_sprint_manual(sprint_id_param INTEGER)
RETURNS JSON AS $$
DECLARE
    result JSON;
    deleted_count INTEGER;
BEGIN
    -- Log the attempt
    RAISE NOTICE 'Attempting to delete sprint with ID: %', sprint_id_param;
    
    -- Check if sprint exists before deletion
    SELECT COUNT(*) INTO deleted_count 
    FROM sprints 
    WHERE sprint_id = sprint_id_param;
    
    RAISE NOTICE 'Sprint exists before deletion: %', (deleted_count > 0);
    
    -- Perform the deletion
    DELETE FROM sprints 
    WHERE sprint_id = sprint_id_param;
    
    -- Get the number of affected rows
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Rows deleted: %', deleted_count;
    
    -- Return result
    result := json_build_object(
        'success', deleted_count > 0,
        'deleted_count', deleted_count,
        'sprint_id', sprint_id_param
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error deleting sprint: %', SQLERRM;
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'sprint_id', sprint_id_param
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_sprint_manual(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_sprint_manual(INTEGER) TO anon; 