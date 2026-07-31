import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import apiClient from '../../../services/apiClient.js';
import { setActiveWorkspace } from '../store/workspaceSlice.js';
import { updateTokenAndUser } from '../../auth/store/authSlice.js';


const updateWorkspaceFeatures = async (workspaceId, features) => {
  return await apiClient.patch(
    `/workspaces/${workspaceId}/features`,
    {
      features,
    }
  );
};


const getSelectedFeatures = (features = []) => {

  const modules = [
    'users',
    'roles',
    'integrations',
    'villas',
    'amenities'
  ];


  return modules.filter(module =>
    features.some(feature =>
      feature === module ||
      (
        typeof feature === 'string' &&
        feature.startsWith(`${module}:`)
      )
    )
  );

};



export const useFeatureConfig = () => {

  const dispatch = useDispatch();
  const navigate = useNavigate();


  const activeWorkspaceId = useSelector(
    state => state.workspace.activeWorkspaceId
  );


  const activeOrganizationId = useSelector(
    state => state.workspace.activeOrganizationId
  );


  const activeRole = useSelector(
    state => state.workspace.activeRole
  );


  const allowedFeatures = useSelector(
    state => state.workspace.allowedFeatures || []
  );


  const currentUser = useSelector(
    state => state.auth.user
  );



  const [selectedFeatures, setSelectedFeatures] =
    useState([]);



  useEffect(() => {

    setSelectedFeatures(
      getSelectedFeatures(
        allowedFeatures
      )
    );

  }, [allowedFeatures]);



  const [loading, setLoading] =
    useState(false);


  const [error, setError] =
    useState(null);




  const toggleFeature = (feature) => {

    setSelectedFeatures(previous => {

      if (previous.includes(feature)) {

        return previous.filter(
          item => item !== feature
        );

      }


      return [
        ...previous,
        feature
      ];

    });

  };





  const submitFeatures = async () => {


    if (!activeWorkspaceId) {

      setError(
        "Workspace ID missing"
      );

      return;

    }



    try {

      setLoading(true);
      setError(null);



      console.log(
        "Initializing workspace",
        {
          workspaceId: activeWorkspaceId,
          features: selectedFeatures
        }
      );



      const response =
        await updateWorkspaceFeatures(
          activeWorkspaceId,
          selectedFeatures
        );



      const data =
        response.data || {};



      const workspace =
        data.workspace || data;



      const updatedFeatures =
        workspace.allowedFeatures ||
        workspace.modulePermissions ||
        selectedFeatures;



      dispatch(

        setActiveWorkspace({

          activeWorkspaceId,

          activeOrganizationId,

          activeRole,

          allowedFeatures:
            updatedFeatures

        })

      );




      if (data.token) {


        try {


          const payload =
            data.token
              .split('.')[1];


          const decoded =
            JSON.parse(
              window.atob(payload)
            );



          dispatch(

            updateTokenAndUser({

              token: data.token,

              user: {
                ...currentUser,

                id: decoded.id,

                email: decoded.email,

                username: decoded.username,

                role: decoded.role,

                permissions:
                  decoded.permissions,

                orgId:
                  decoded.orgId

              }

            })

          );


        }
        catch (jwtError) {

          console.error(
            "Token update failed",
            jwtError
          );

        }


      }



      navigate('/dashboard');

      window.location.reload();



    }
    catch (error) {


      console.error(
        "Workspace initialization failed:",
        error.response?.data || error
      );


      setError(

        error.response?.data?.message ||
        "Workspace initialization failed"

      );


    }
    finally {

      setLoading(false);

    }


  };





  return {

    selectedFeatures,

    loading,

    error,

    toggleFeature,

    submitFeatures

  };

};


export default useFeatureConfig;