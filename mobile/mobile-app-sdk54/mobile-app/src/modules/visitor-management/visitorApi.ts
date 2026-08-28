import axios from 'axios';
import { Visitor } from './visitorSlice';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export const visitorApi = {
  getWalkIns: async (): Promise<Visitor[]> => {
    try {
      // const response = await axios.get(`${API_URL}/visitors/walk-ins`);
      // return response.data;
      
      // Mock data for UI development
      return [
        {
          id: 'v1',
          name: 'John Doe',
          purpose: 'Delivery',
          status: 'pending',
          arrivalTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ];
    } catch (error) {
      console.error('Error fetching walk-ins', error);
      throw error;
    }
  },
  
  approveVisitor: async (id: string): Promise<boolean> => {
    try {
      // await axios.post(`${API_URL}/visitors/${id}/approve`);
      return true;
    } catch (error) {
      console.error('Error approving visitor', error);
      throw error;
    }
  },
  
  rejectVisitor: async (id: string): Promise<boolean> => {
    try {
      // await axios.post(`${API_URL}/visitors/${id}/reject`);
      return true;
    } catch (error) {
      console.error('Error rejecting visitor', error);
      throw error;
    }
  }
};
